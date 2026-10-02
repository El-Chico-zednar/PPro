// import-races.js — importa carreras populares de finishers.com a Supabase
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
require("dotenv").config({ quiet: true });
const fs = require("fs");
const { parseArgs } = require("util");

// Uso: node import-races.js --help

const GPX_BUCKET = process.env.SUPABASE_GPX_BUCKET || "race-tracks";
const TARGET_TABLE =
    process.env.SUPABASE_TARGET_TABLE || "race_tracks_duplicate";

// El cliente se crea al primer uso, para que --help y --dry-run funcionen sin claves.
let supabaseClient = null;
function getSupabase() {
    if (supabaseClient) return supabaseClient;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        console.error("Error: Faltan las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (o sus variantes VITE_). Mira .env.example");
        process.exit(1);
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
}

// Distancias homologadas que nos interesan
const HOMOLOGATED_DISTANCES = {
    "5K": { min: 4.5, max: 5.5 },
    "10K": { min: 9.5, max: 10.5 },
    "Media Maratón": { min: 20.5, max: 21.5 },
    "Maratón": { min: 41.5, max: 43 }
};

// "https://www.finishers.com/es/evento/maraton-de-malaga" -> "maraton-de-malaga"
function getSlugFromUrl(url) {
    return url.split("/").filter(Boolean).pop();
}

// Convierte "14 de diciembre de 2025" -> "2025-12-14"
function parseSpanishDateToISO(text) {
    if (!text) return null;

    const months = {
        enero: 1,
        febrero: 2,
        marzo: 3,
        abril: 4,
        mayo: 5,
        junio: 6,
        julio: 7,
        agosto: 8,
        septiembre: 9,
        setiembre: 9,
        octubre: 10,
        noviembre: 11,
        diciembre: 12
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
    return null;
}

// finishers.com a veces nunca llega a "networkidle" (analítica, anuncios): esperamos
// al DOM y damos un margen acotado a la red sin fallar si no se calma.
async function gotoPage(page, url) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => { });
}

// Extrae datos básicos de la página de Finishers
async function scrapeRaceData(page) {
    const name = (await page.locator("h1").first().textContent())?.trim();

    // Extraer location del breadcrumb (ej: "Costa Teguise")
    // Buscamos el penúltimo enlace del breadcrumb que suele ser la ciudad
    const breadcrumbLinks = await page.locator('nav a').all();
    let location = null;
    if (breadcrumbLinks.length >= 2) {
        // El penúltimo enlace suele ser la ciudad
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

    // Extraer distancia como texto (Maratón, Media Maratón, etc.)
    const distanceText = (
        await page
            .locator("text=/loop x .*km/i")
            .first()
            .textContent()
            .catch(() => null)
    )?.trim() || null;

    let distance_km = null;
    if (distanceText) {
        // Extraer el número de km
        const m = distanceText.match(/([\d.,]+)\s*km/i);
        if (m) {
            const val = m[1].replace(".", "").replace(",", ".");
            const num = Number(val);

            // Convertir a texto según la distancia
            if (!Number.isNaN(num)) {
                if (num >= 42 && num <= 43) {
                    distance_km = "Maratón";
                } else if (num >= 21 && num <= 22) {
                    distance_km = "Media Maratón";
                } else if (num >= 10 && num <= 11) {
                    distance_km = "10K";
                } else if (num >= 5 && num <= 6) {
                    distance_km = "5K";
                } else {
                    distance_km = `${num}K`;
                }
            }
        }
    }

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

    // Extraer superficie y convertir a "Asfalto" si es "Carrera por carretera"
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
        distance_km,
        elevation_gain,
        surface,
        cover_image_url
    };
}

async function closeBlackFridayDialog(page) {
    try {
        // Dialog con aria-label="information" que bloquea el botón del mapa
        const dialog = page.getByLabel("information", { exact: false });
        const isVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) return;

        // Intentar cerrar con botón de cierre dentro del diálogo
        const closeButton = dialog.getByRole("button", { name: /close|cerrar|×/i });
        const closeFound = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (closeFound) {
            await closeButton.click({ timeout: 1000 }).catch(() => { });
        } else {
            // Fallback: presionar Escape si no hay botón visible
            await page.keyboard.press("Escape").catch(() => { });
        }

        // Dar un pequeño margen para que desaparezca
        await page.waitForTimeout(500);
    } catch {
        // No bloquear el flujo si falla
    }
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

async function closeAnyMapModal(page) {
    try {
        const dialog = page.locator('[role="dialog"]');
        const isAttached = await dialog.count().then(c => c > 0).catch(() => false);

        if (isAttached) {
            const closeBtn = dialog.getByRole('button', { name: /close|cerrar|×/i });
            const hasClose = await closeBtn.isVisible({ timeout: 500 }).catch(() => false);
            if (hasClose) {
                await closeBtn.click({ force: true }).catch(() => { });
            }
        }

        await page.keyboard.press('Escape').catch(() => { });
        await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 2000 }).catch(() => { });
        await page.evaluate(() => {
            document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
            document.querySelectorAll('[class*="backdrop"], [class*="overlay"]').forEach((el) => {
                el.remove();
            });
            const portalRoot = document.getElementById('headlessui-portal-root');
            if (portalRoot && portalRoot.parentElement) {
                portalRoot.parentElement.removeChild(portalRoot);
            }
            document.documentElement.style.pointerEvents = '';
        }).catch(() => { });
        await removeObstructiveOverlays(page);
        await closeBlackFridayDialog(page);
        await page.waitForTimeout(300);
    } catch {
        // no-op
    }
}

// Detecta distancias disponibles (tabs o distancia única)
async function detectAvailableDistances(page) {
    console.log("🔍 Detectando distancias disponibles...");
    await removeObstructiveOverlays(page);
    await closeBlackFridayDialog(page);

    const distances = [];

    const distanceTabs = await page.locator('[role="tab"], button[id*="panel"], a[id*="panel"]').all();
    for (const tab of distanceTabs) {
        const tabText = (await tab.textContent())?.trim() || "";
        const tabId = (await tab.getAttribute("id")) || "";
        const panelId = (await tab.getAttribute("aria-controls")) || "";

        // Detección explícita de media/maratón por texto o aria-controls
        const textLower = tabText.toLowerCase();
        const panelLower = panelId.toLowerCase();
        if (textLower.includes("media marat") || textLower.includes("semimar") || panelLower.includes("semi")) {
            distances.push({ category: "Media Maratón", km: 21.1, tab, tabText, panelId: panelId || null, panelSelector: panelId ? `[id="${panelId}"]` : null });
            console.log(`  ✓ Encontrada: Media Maratón (21.1 km) - "${tabText}"`);
            continue;
        }
        if (textLower.includes("marat") || panelLower.includes("marathon")) {
            distances.push({ category: "Maratón", km: 42.2, tab, tabText, panelId: panelId || null, panelSelector: panelId ? `[id="${panelId}"]` : null });
            console.log(`  ✓ Encontrada: Maratón (42.2 km) - "${tabText}"`);
            continue;
        }

        const distanceMatch = tabText.match(/(\d+(?:[.,]\d+)?)\s*km/i) || tabId.match(/(\d+(?:[.,]\d+)?)/);
        if (distanceMatch) {
            const kmValue = parseFloat(distanceMatch[1].replace(",", "."));
            const category = classifyDistance(kmValue);
            if (category) {
                distances.push({ category, km: kmValue, tab, tabText, panelId: panelId || null, panelSelector: panelId ? `[id="${panelId}"]` : null });
                console.log(`  ✓ Encontrada: ${category} (${kmValue} km) - "${tabText}"`);
            } else {
                console.log(`  ⊘ Ignorada: ${kmValue} km (no homologada) - "${tabText}"`);
            }
        }
    }

    if (distances.length === 0) {
        console.log("  ℹ️  No se encontraron tabs, buscando distancia única...");
        let distanceText = (
            await page
                .locator("text=/loop x .*km/i, text=/\\d+(?:[.,]\\d+)?\\s*km/i")
                .first()
                .textContent()
                .catch(() => null)
        )?.trim() || null;

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
                    distances.push({ category, km: kmValue, tab: null, tabText: "Distancia única", panelSelector: null });
                    console.log(`  ✓ Distancia única: ${category} (${kmValue} km)`);
                } else {
                    console.log(`  ⊘ Distancia única ignorada: ${kmValue} km (no homologada)`);
                }
            } else if ((distanceText.toLowerCase().includes("media") || distanceText.toLowerCase().includes("semi")) && !distances.find(d => d.category === "Media Maratón")) {
                distances.push({ category: "Media Maratón", km: 21.1, tab: null, tabText: distanceText, panelSelector: null });
                console.log(`  ✓ Distancia única: Media Maratón (21.1 km)`);
            } else if (distanceText.toLowerCase().includes("marat") && !distances.find(d => d.category === "Maratón")) {
                distances.push({ category: "Maratón", km: 42.2, tab: null, tabText: distanceText, panelSelector: null });
                console.log(`  ✓ Distancia única: Maratón (42.2 km)`);
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

async function hasMapButton(page, panelSelector) {
    await removeObstructiveOverlays(page);
    await closeBlackFridayDialog(page);
    const scope = panelSelector ? page.locator(panelSelector) : page.locator('body');
    const mapButtons = scope.locator('text=/Ver o descargar el mapa/i');
    const count = await mapButtons.count();
    if (count === 0) return false;
    // comprobar si alguno es visible
    const visible = await mapButtons.evaluateAll((els) =>
        els.some((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
        })
    ).catch(() => false);
    return visible;
}

// Descarga el GPX de la distancia activa
async function downloadGpxForDistance(page, panelSelector) {
    try {
        await removeObstructiveOverlays(page);
        await closeBlackFridayDialog(page);

        const scope = panelSelector ? page.locator(panelSelector) : page.locator('body');
        const modalButton = scope.locator('text=/Ver o descargar el mapa/i').first();
        await modalButton.waitFor({ state: "attached", timeout: 15000 });
        await modalButton.scrollIntoViewIfNeeded();
        await modalButton.click({ force: true, timeout: 20000 });

        await page.waitForSelector('[role="dialog"]', { state: 'attached', timeout: 15000 });
        await page.waitForTimeout(1500);

        console.log("🔍 Buscando iframe en el modal...");
        const iframe = page.frameLocator('iframe[src*="/trace/"]');
        await page.waitForTimeout(2000);

        const allLinksInIframe = await iframe.locator('a[href*=".gpx"]').all();
        console.log(`Encontrados ${allLinksInIframe.length} enlaces con .gpx en el iframe`);
        for (let i = 0; i < Math.min(allLinksInIframe.length, 5); i++) {
            const href = await allLinksInIframe[i].getAttribute('href');
            const text = await allLinksInIframe[i].textContent();
            console.log(`  Link ${i + 1}: "${text?.trim()}" -> ${href}`);
        }

        const downloadLink = iframe.locator('a[href*=".gpx"]').first();
        await downloadLink.waitFor({ state: "visible", timeout: 20000 });

        const gpxUrl = await downloadLink.getAttribute("href");
        if (!gpxUrl) {
            throw new Error("No se encontró el enlace directo al GPX");
        }

        console.log("✅ GPX URL encontrada:", gpxUrl);

        const response = await axios.get(gpxUrl, { responseType: "arraybuffer" });

        await page.keyboard.press('Escape').catch(() => { });
        await page.waitForTimeout(500);

        return { buffer: Buffer.from(response.data), gpxUrl };
    } catch (err) {
        console.log(`❌ Error descargando GPX: ${err.message}`);
        try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        } catch { }
        return null;
    }
}


// Procesa una carrera
async function importOneRace(browser, eventUrl, { dryRun = false } = {}) {
    const slug = getSlugFromUrl(eventUrl);
    const page = await browser.newPage();

    console.log(`➡️  Procesando ${slug} (${eventUrl})`);

    await gotoPage(page, eventUrl);
    await removeObstructiveOverlays(page);
    await closeBlackFridayDialog(page);

    const baseData = await scrapeRaceData(page);

    if (!baseData.name) {
        console.log(`⚠️  No se pudo obtener el nombre para ${eventUrl}, salto.`);
        await page.close();
        return;
    }

    // finishers.com pone el año de la próxima edición en el título pero mantiene la fecha
    // de la anterior hasta que se anuncia la nueva: esas carreras ya se han celebrado.
    const today = new Date().toISOString().slice(0, 10);
    if (baseData.event_date && baseData.event_date < today) {
        console.log(`⊘ ${baseData.name}: la fecha publicada (${baseData.event_date}) ya ha pasado, salto.`);
        await page.close();
        return;
    }

    const distances = await detectAvailableDistances(page);

    if (distances.length === 0) {
        console.log(`⚠️  No se encontraron distancias homologadas, salto.`);
        await page.close();
        return;
    }

    for (let i = 0; i < distances.length; i++) {
        let distance = distances[i];
        const targetCategory = distance.category;

        // Para distancias posteriores, recargar la página y recalcular tabs
        if (i > 0) {
            await gotoPage(page, eventUrl);
            await removeObstructiveOverlays(page);
            await closeBlackFridayDialog(page);
            const refreshed = await detectAvailableDistances(page);
            const match = refreshed.find((d) => d.category === targetCategory);
            if (!match) {
                console.log(`    ⊘ No se encontró la distancia ${targetCategory} tras recargar, se omite.`);
                continue;
            }
            distance = match;
        }
        console.log(`\n  📏 Procesando ${distance.category}...`);

        await closeAnyMapModal(page);
        if (distance.tab) {
            try {
                if (distance.panelSelector) {
                    const tabCandidate = page.locator(`[aria-controls="${distance.panelId}"]`).first();
                    await tabCandidate.click({ timeout: 10000, force: true });
                } else {
                    await distance.tab.click({ force: true });
                }
                await page.waitForTimeout(1000);
                await removeObstructiveOverlays(page);
                await closeBlackFridayDialog(page);
                if (distance.panelSelector) {
                    const panel = page.locator(distance.panelSelector);
                    await panel.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });
                }
            } catch (err) {
                console.log(`    ⚠️  Error haciendo clic en el tab: ${err.message}`);
                continue;
            }
        }

        const distanceData = await scrapeDistanceSpecificData(page);

        const mapAvailable = await hasMapButton(page, distance.panelSelector);
        if (!mapAvailable) {
            console.log(`    ⊘ No tiene botón de mapa, saltando guardado.`);
            continue;
        }

        const gpxResult = await downloadGpxForDistance(page, distance.panelSelector);
        if (!gpxResult) {
            console.log(`    ⊘ No se pudo descargar GPX, saltando guardado.`);
            await closeAnyMapModal(page);
            continue;
        }

        const distanceSlug = `${slug}-${distance.category.toLowerCase().replace(/\\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
        const gpxFileName = `New_tracks/${distanceSlug}.gpx`;

        // Ojo: el regex escapa "\\s", así que los espacios no se convierten en guiones
        // ("Media Maratón" -> "mediamaratn"). No se corrige para no cambiar los slugs
        // ya guardados (el upsert va por slug y se duplicarían las filas).
        const row = {
            name: baseData.name,
            slug: distanceSlug,
            location: baseData.location,
            country: baseData.country,
            distance_km: distance.category,
            elevation_gain: distanceData.elevation_gain ?? baseData.elevation_gain ?? null,
            event_date: baseData.event_date,
            surface: baseData.surface,
            gpx_storage_path: gpxFileName,
            cover_image_url: baseData.cover_image_url
        };

        if (dryRun) {
            console.log(`    🧪 [dry-run] Se guardaría (GPX de ${gpxResult.buffer.length} bytes):`, row);
            await closeAnyMapModal(page);
            continue;
        }

        const supabase = getSupabase();
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

        const { error: upsertError } = await supabase
            .from(TARGET_TABLE)
            .upsert(
                [{ ...row, gpx_storage_path }],
                { onConflict: "slug" }
            );

        if (upsertError) {
            console.log(`    ❌ Error upsert ${TARGET_TABLE} (${distanceSlug}): ${upsertError.message}`);
        } else {
            console.log(`    ✅ ${baseData.name} (${distance.category}) importada / actualizada -> ${gpx_storage_path}`);
        }

        await closeAnyMapModal(page);
    }

    await page.close();
}


// Extrae todas las URLs de carreras de una página de listado de finishers.com
async function extractRaceUrlsFromListing(browser, listingUrl) {
    console.log(`\n📋 Extrayendo carreras de: ${listingUrl}`);

    const page = await browser.newPage();
    await gotoPage(page, listingUrl);

    const urls = new Set();
    for (const link of await page.locator('a[href*="/evento/"]').all()) {
        const href = await link.getAttribute("href");
        if (href && href.includes("/evento/")) {
            urls.add(href.startsWith("http") ? href : `https://www.finishers.com${href}`);
        }
    }

    await page.close();
    console.log(`✅ Encontradas ${urls.size} carreras únicas`);
    return [...urls];
}

// Devuelve la URL de listado para cada página de 1..pages (sobrescribe el parámetro page)
function expandListingPages(listingUrl, pages) {
    if (!pages) return [listingUrl];
    return Array.from({ length: pages }, (_, i) => {
        const url = new URL(listingUrl);
        url.searchParams.set("page", String(i + 1));
        return url.toString();
    });
}

// Borra las carreras con fecha anterior a hoy (fila + GPX en storage)
async function prunePastRaces({ dryRun }) {
    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from(TARGET_TABLE)
        .select("id, name, distance_km, event_date, gpx_storage_path")
        .lt("event_date", today)
        .order("event_date", { ascending: true });

    if (error) {
        console.error(`❌ Error consultando ${TARGET_TABLE}: ${error.message}`);
        process.exitCode = 1;
        return;
    }

    console.log(`\n🧹 ${data.length} carreras con fecha anterior a ${today}:`);
    for (const race of data) {
        console.log(`  - ${race.event_date}  ${race.name} (${race.distance_km})`);
    }
    if (data.length === 0) return;

    if (dryRun) {
        console.log("🧪 [dry-run] No se borra nada.");
        return;
    }

    const paths = data.map((r) => r.gpx_storage_path).filter(Boolean);
    if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(GPX_BUCKET).remove(paths);
        if (storageError) {
            console.error(`❌ Error borrando GPX del bucket ${GPX_BUCKET}: ${storageError.message}`);
            process.exitCode = 1;
            return;
        }
    }

    const { error: deleteError } = await supabase
        .from(TARGET_TABLE)
        .delete()
        .in("id", data.map((r) => r.id));

    if (deleteError) {
        console.error(`❌ Error borrando filas de ${TARGET_TABLE}: ${deleteError.message}`);
        process.exitCode = 1;
        return;
    }
    console.log(`✅ Borradas ${data.length} carreras pasadas y ${paths.length} GPX.`);
}

const HELP = `
Importa carreras populares de finishers.com a Supabase (tabla ${TARGET_TABLE},
bucket ${GPX_BUCKET}). Solo guarda distancias homologadas: 5K, 10K, Media Maratón, Maratón.

Uso:
  node import-races.js [opciones] [URL de evento ...]

Origen de las carreras (se pueden combinar):
  <url> ...               URLs de evento, p. ej. https://www.finishers.com/es/evento/maraton-de-malaga
  --file <ruta>           Fichero con una URL de evento por línea (# para comentarios)
  --listing <url>         URL de un listado de finishers.com (repetible)
  --pages <n>             Recorre las páginas 1..n de cada --listing

Mantenimiento:
  --prune-past            Borra las carreras con fecha pasada (fila y GPX)

Otras opciones:
  --dry-run               Hace todo menos escribir en Supabase (muestra lo que guardaría o borraría)
  --headed                Muestra el navegador (por defecto va oculto)
  --slow-mo <ms>          Retardo entre acciones del navegador (por defecto 0; 300 con --headed)
  -h, --help              Muestra esta ayuda
`;

function readUrlsFromFile(filePath) {
    return fs
        .readFileSync(filePath, "utf8")
        .split("\n")
        .map((line) => line.replace(/#.*/, "").trim())
        .filter(Boolean);
}

// MAIN
async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            file: { type: "string" },
            listing: { type: "string", multiple: true },
            pages: { type: "string" },
            "prune-past": { type: "boolean" },
            "dry-run": { type: "boolean" },
            headed: { type: "boolean" },
            "slow-mo": { type: "string" },
            help: { type: "boolean", short: "h" }
        }
    });

    const listings = values.listing || [];
    const hasSources = positionals.length > 0 || values.file || listings.length > 0;

    if (values.help || (!hasSources && !values["prune-past"])) {
        console.log(HELP);
        if (!values.help) process.exitCode = 1;
        return;
    }

    const pages = values.pages ? Number(values.pages) : null;
    if (values.pages && (!Number.isInteger(pages) || pages < 1)) {
        console.error("Error: --pages debe ser un entero mayor que 0");
        process.exitCode = 1;
        return;
    }

    const dryRun = Boolean(values["dry-run"]);
    if (dryRun) console.log("🧪 Modo dry-run: no se escribirá nada en Supabase.");

    if (hasSources) {
        const headed = Boolean(values.headed);
        const slowMo = values["slow-mo"] ? Number(values["slow-mo"]) : headed ? 300 : 0;
        const browser = await chromium.launch({ headless: !headed, slowMo });
        // En headless, finishers.com sirve la página sin el botón del mapa si ve el
        // user-agent "HeadlessChrome": usamos el de un Chrome normal de escritorio.
        const context = await browser.newContext({
            userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
            viewport: { width: 1440, height: 900 },
            locale: "es-ES"
        });
        // finishers.com a veces tarda más de los 30 s por defecto en llegar a "networkidle"
        context.setDefaultNavigationTimeout(90000);

        try {
            const events = new Set(positionals);
            if (values.file) readUrlsFromFile(values.file).forEach((u) => events.add(u));
            for (const listing of listings) {
                for (const pageUrl of expandListingPages(listing, pages)) {
                    (await extractRaceUrlsFromListing(context, pageUrl)).forEach((u) => events.add(u));
                }
            }

            console.log(`\n🚀 Procesando ${events.size} carreras...\n`);
            let failed = 0;
            for (const url of events) {
                try {
                    await importOneRace(context, url, { dryRun });
                } catch (err) {
                    failed++;
                    console.error(`❌ Error procesando ${url}:`, err.message);
                }
            }
            if (failed > 0) {
                console.log(`\n⚠️  ${failed} de ${events.size} carreras fallaron.`);
                process.exitCode = 1;
            }
        } finally {
            await browser.close();
        }
    }

    if (values["prune-past"]) {
        await prunePastRaces({ dryRun });
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
