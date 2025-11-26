// import_finishers_playwright_v2.js - Versión multi-distancia
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
require("dotenv").config();

// Inicializamos Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GPX_BUCKET = process.env.SUPABASE_GPX_BUCKET || "race-tracks";
const TARGET_TABLE = process.env.SUPABASE_TARGET_TABLE || "race_tracks_duplicate";

// Distancias homologadas que nos interesan
const HOMOLOGATED_DISTANCES = {
    "5K": { min: 4.5, max: 5.5 },
    "10K": { min: 9.5, max: 10.5 },
    "Media Maratón": { min: 20.5, max: 21.5 },
    "Maratón": { min: 41.5, max: 43 }
};

function getSlugFromUrl(url) {
    return url.split("/").filter(Boolean).pop();
}

function parseSpanishDateToISO(text) {
    if (!text) return null;

    const months = {
        enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
        julio: 7, agosto: 8, septiembre: 9, setiembre: 9,
        octubre: 10, noviembre: 11, diciembre: 12
    };

    const match = text.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const month = months[monthName];

    if (!month) return null;

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    return `${year}-${mm}-${dd}`;
}

// Clasifica una distancia en km a su categoría homologada
function classifyDistance(km) {
    for (const [category, range] of Object.entries(HOMOLOGATED_DISTANCES)) {
        if (km >= range.min && km <= range.max) {
            return category;
        }
    }
    return null; // No es una distancia homologada
}

// Extrae datos básicos de la carrera (comunes a todas las distancias)
async function scrapeBaseRaceData(page) {
    const name = (await page.locator("h1").first().textContent())?.trim();

    const breadcrumbLinks = await page.locator('nav a').all();
    let location = null;
    if (breadcrumbLinks.length >= 2) {
        location = (await breadcrumbLinks[breadcrumbLinks.length - 2].textContent())?.trim() || null;
    }

    const country = "España";

    const dateText = (
        await page
            .locator("text=/\\d{1,2}\\s+de\\s+[a-záéíóúñ]+\\s+de\\s+\\d{4}/i")
            .first()
            .textContent()
            .catch(() => null)
    )?.trim() || null;

    const event_date = parseSpanishDateToISO(dateText);

    const surfaceText = (
        await page
            .locator("text=/Carrera por carretera/i")
            .first()
            .textContent()
            .catch(() => null)
    )?.trim() || null;

    let surface = null;
    if (surfaceText && surfaceText.toLowerCase().includes("carretera")) {
        surface = "Asfalto";
    } else if (surfaceText) {
        surface = surfaceText;
    }

    const cover_image_url =
        (await page
            .locator("img")
            .first()
            .getAttribute("src")
            .catch(() => null)) || null;

    return {
        name,
        location,
        country,
        event_date,
        surface,
        cover_image_url
    };
}

async function removeObstructiveOverlays(page) {
    try {
        await page.evaluate(() => {
            document
                .querySelectorAll('[id*="wisepops"], [class*="wisepops"], [class*="tp-backdrop"]')
                .forEach((el) => el.remove());
        });
    } catch {
        // Ignorar si no hay overlays
    }
}

async function closeBlackFridayDialog(page) {
    try {
        const dialog = page.getByLabel("information", { exact: false });
        const isVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) return;

        const closeButton = dialog.getByRole("button", { name: /close|cerrar|×/i });
        const closeFound = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (closeFound) {
            await closeButton.click({ timeout: 1000 }).catch(() => { });
        } else {
            await page.keyboard.press("Escape").catch(() => { });
        }

        await page.waitForTimeout(500);
    } catch {
        // si falla, continuamos sin bloquear
    }
}

// Detecta todas las distancias disponibles en la página
async function detectAvailableDistances(page) {
    console.log("🔍 Detectando distancias disponibles...");

    // Intentar cerrar/eliminar popups molestos
    await removeObstructiveOverlays(page);
    await closeBlackFridayDialog(page);

    // Buscar tabs de distancias (pueden estar en diferentes formatos)
    const distanceTabs = await page.locator('[role="tab"], button[id*="panel"], a[id*="panel"]').all();

    const distances = [];

    for (const tab of distanceTabs) {
        const tabText = (await tab.textContent())?.trim() || "";
        const tabId = (await tab.getAttribute("id")) || "";

        // Buscar patrones de distancia en el texto o ID
        const distanceMatch = tabText.match(/(\d+(?:[.,]\d+)?)\s*km/i) ||
            tabId.match(/(\d+(?:[.,]\d+)?)/);

        if (distanceMatch) {
            const kmValue = parseFloat(distanceMatch[1].replace(",", "."));
            const category = classifyDistance(kmValue);

            if (category) {
                distances.push({
                    category,
                    km: kmValue,
                    tab,
                    tabText
                });
                console.log(`  ✓ Encontrada: ${category} (${kmValue} km) - "${tabText}"`);
            } else {
                console.log(`  ⊘ Ignorada: ${kmValue} km (no homologada) - "${tabText}"`);
            }
        }
    }

    // Si no encontramos tabs, asumimos que solo hay una distancia
    if (distances.length === 0) {
        console.log("  ℹ️  No se encontraron tabs, buscando distancia única...");

        // Estrategia 1: Buscamos en elementos específicos
        let distanceText = (
            await page
                .locator("text=/loop x .*km/i, text=/\\d+(?:[.,]\\d+)?\\s*km/i")
                .first()
                .textContent()
                .catch(() => null)
        )?.trim() || null;

        // Estrategia 2: Si falla, buscamos cualquier elemento corto que contenga "km"
        if (!distanceText) {
            const kmElements = await page.locator('text=/\\d+\\s*km/i').all();
            for (const el of kmElements) {
                const text = await el.textContent();
                if (text && text.length < 20 && /\d/.test(text)) {
                    distanceText = text.trim();
                    break;
                }
            }
        }

        console.log(`    Texto encontrado: "${distanceText}"`);

        if (distanceText) {
            const match = distanceText.match(/([\d.,]+)\s*km/i);
            if (match) {
                const kmValue = parseFloat(match[1].replace(".", "").replace(",", "."));
                const category = classifyDistance(kmValue);

                if (category) {
                    distances.push({
                        category,
                        km: kmValue,
                        tab: null,
                        tabText: "Distancia única"
                    });
                    console.log(`  ✓ Distancia única: ${category} (${kmValue} km)`);
                } else {
                    console.log(`  ⊘ Distancia única ignorada: ${kmValue} km (no homologada)`);
                }
            }
        }
    }

    return distances;
}

// Extrae datos específicos de una distancia (desnivel)
async function scrapeDistanceSpecificData(page) {
    const elevationText = (
        await page
            .locator("text=/Desnivel.*mD\\+/i")
            .first()
            .textContent()
            .catch(() => null)
    )?.trim() || null;

    let elevation_gain = null;
    if (elevationText) {
        const m = elevationText.match(/(\d+)\s*mD\+/i);
        if (m) elevation_gain = Number(m[1]);
    }

    return { elevation_gain };
}

// Verifica si existe el botón de mapa para una distancia
async function hasMapButton(page) {
    const mapButtons = await page.locator('text=/Ver o descargar el mapa/i').all();
    return mapButtons.length > 0;
}

// Descarga el GPX de una distancia
async function downloadGpxForDistance(page) {
    try {
        // Cerrar popups antes de interactuar
        await removeObstructiveOverlays(page);
        await closeBlackFridayDialog(page);
        const modalButton = page.locator('text=/Ver o descargar el mapa/i').first();
        await modalButton.waitFor({ state: "visible", timeout: 15000 });
        await modalButton.scrollIntoViewIfNeeded();
        await modalButton.click({ force: true, timeout: 15000 });

        await page.waitForSelector('[role="dialog"]', { state: 'attached', timeout: 10000 });
        await page.waitForTimeout(1500);

        const iframe = page.frameLocator('iframe[src*="/trace/"]');
        await page.waitForTimeout(2000);

        const downloadLink = iframe.locator('a[href$=".gpx"]').first();
        await downloadLink.waitFor({ state: "visible", timeout: 10000 });

        const gpxUrl = await downloadLink.getAttribute("href");
        if (!gpxUrl) {
            throw new Error("No se encontró el enlace directo al GPX");
        }

        console.log(`    ✅ GPX URL encontrada: ${gpxUrl}`);

        const response = await axios.get(gpxUrl, { responseType: "arraybuffer" });

        // Cerrar el modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        return {
            buffer: Buffer.from(response.data),
            gpxUrl
        };
    } catch (err) {
        console.log(`    ❌ Error descargando GPX: ${err.message}`);
        // Intentar cerrar el modal si está abierto
        try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        } catch { }
        return null;
    }
}

// Procesa una carrera con múltiples distancias
async function importOneRace(browser, eventUrl) {
    const slug = getSlugFromUrl(eventUrl);
    const page = await browser.newPage();

    console.log(`\n➡️  Procesando ${slug} (${eventUrl})`);

    await page.goto(eventUrl, { waitUntil: "networkidle" });
    await removeObstructiveOverlays(page);
    await closeBlackFridayDialog(page);

    // 1) Extraer datos base de la carrera
    const baseData = await scrapeBaseRaceData(page);

    if (!baseData.name) {
        console.log(`⚠️  No se pudo obtener el nombre, salto.`);
        await page.close();
        return;
    }

    console.log(`📋 Carrera: ${baseData.name}`);

    // 2) Detectar todas las distancias disponibles
    const distances = await detectAvailableDistances(page);

    if (distances.length === 0) {
        console.log(`⚠️  No se encontraron distancias homologadas, salto.`);
        await page.close();
        return;
    }

    // 3) Procesar cada distancia
    for (const distance of distances) {
        console.log(`\n  📏 Procesando ${distance.category}...`);

        // Si hay tab, hacer clic en él
        if (distance.tab) {
            try {
                await distance.tab.click();
                await page.waitForTimeout(1000);
            } catch (err) {
                console.log(`    ⚠️  Error haciendo clic en el tab: ${err.message}`);
                continue;
            }
        }

        // Extraer datos específicos de esta distancia
        const distanceData = await scrapeDistanceSpecificData(page);

        // Verificar si tiene botón de mapa
        const hasMap = await hasMapButton(page);

        if (!hasMap) {
            console.log(`    ⊘ No tiene botón de mapa, saltando guardado.`);
            continue;
        }

        // Descargar GPX
        const gpxResult = await downloadGpxForDistance(page);

        if (!gpxResult) {
            console.log(`    ⊘ No se pudo descargar GPX, saltando guardado.`);
            continue;
        }

        // Subir GPX a Supabase
        const distanceSlug = `${slug}-${distance.category.toLowerCase().replace(/\s+/g, "-")}`;
        const gpxFileName = `New_tracks/${distanceSlug}.gpx`;

        const { data: storageData, error: storageError } = await supabase.storage
            .from(GPX_BUCKET)
            .upload(gpxFileName, gpxResult.buffer, {
                contentType: "application/gpx+xml",
                upsert: true
            });

        if (storageError) {
            console.log(`    ❌ Error subiendo GPX: ${storageError.message}`);
            continue;
        }

        const gpx_storage_path = storageData.path;

        // Guardar en BD con GPX
        const { error: upsertError } = await supabase
            .from(TARGET_TABLE)
            .upsert(
                [{
                    name: `${baseData.name} - ${distance.category}`,
                    slug: distanceSlug,
                    location: baseData.location,
                    country: baseData.country,
                    distance_km: distance.category,
                    elevation_gain: distanceData.elevation_gain,
                    event_date: baseData.event_date,
                    surface: baseData.surface,
                    gpx_storage_path,
                    cover_image_url: baseData.cover_image_url
                }],
                { onConflict: "slug" }
            );

        if (upsertError) {
            console.log(`    ❌ Error guardando: ${upsertError.message}`);
        } else {
            console.log(`    ✅ ${distance.category} guardada con GPX -> ${gpx_storage_path}`);
        }
    }

    await page.close();
    console.log(`✅ Carrera ${slug} procesada completamente`);
}

// Extrae todas las URLs de carreras de una página de listado
async function extractRaceUrlsFromListing(browser, listingUrl) {
    console.log(`\n📋 Extrayendo carreras de: ${listingUrl}`);

    const page = await browser.newPage();
    await page.goto(listingUrl, { waitUntil: "networkidle" });

    // Buscar todos los enlaces a eventos
    const eventLinks = await page.locator('a[href*="/evento/"]').all();

    const urls = new Set(); // Usar Set para evitar duplicados

    for (const link of eventLinks) {
        const href = await link.getAttribute('href');
        if (href && href.includes('/evento/')) {
            // Construir URL completa si es relativa
            const fullUrl = href.startsWith('http')
                ? href
                : `https://www.finishers.com${href}`;
            urls.add(fullUrl);
        }
    }

    await page.close();

    const urlArray = Array.from(urls);
    console.log(`✅ Encontradas ${urlArray.length} carreras únicas`);

    return urlArray;
}

// MAIN
(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 300 });

    // Opción 1: Procesar carreras desde una URL de listado
    const listingUrl = "https://www.finishers.com/es/courses?discipline=road&location_t=country&location_l=Espa%C3%B1a&location_v=1f42f9da-f693-4bc9-96de-bb6e531060a7&dmin=21097&dmax=21098&page=3";

    const events = await extractRaceUrlsFromListing(browser, listingUrl);

    // Opción 2: O usar URLs específicas manualmente
    // const events = [
    //     "https://www.finishers.com/es/evento/maraton-de-lanzarote",
    // ];

    console.log(`\n🚀 Iniciando procesamiento de ${events.length} carreras...\n`);

    for (const url of events) {
        try {
            await importOneRace(browser, url);
        } catch (err) {
            console.error(`❌ Error procesando ${url}:`, err.message);
        }
    }

    await browser.close();
    console.log(`\n✅ Proceso completado!`);
})();
