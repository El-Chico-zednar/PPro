# finishers-scraper

Importa las **carreras populares** que muestra la home de la app desde
[finishers.com](https://www.finishers.com) a Supabase:

1. Abre cada evento con Playwright y saca nombre, fecha, ubicación, superficie y desnivel.
2. Se queda solo con las distancias homologadas: 5K, 10K, Media Maratón y Maratón.
3. Descarga el GPX de cada distancia y lo sube al bucket `race-tracks` (`New_tracks/<slug>.gpx`).
4. Hace upsert por `slug` en la tabla `race_tracks_duplicate`, que es la que lee `HomePage.tsx`.

## Puesta en marcha

```bash
cd finishers-scraper
npm install          # instala también Chromium para Playwright
cp .env.example .env # y rellena SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
```

La clave `service_role` salta las políticas RLS: guárdala solo en `.env` (está en `.gitignore`).

## Uso

```bash
# Una o varias carreras concretas
npm run import -- https://www.finishers.com/es/evento/maraton-de-malaga

# Una lista de URLs en un fichero (ver races.example.txt)
npm run import -- --file races.txt

# Todas las carreras de un listado de finishers.com, páginas 1 a 3
npm run import -- --listing "https://www.finishers.com/es/courses?discipline=road&location_t=country&location_l=Espa%C3%B1a&location_v=1f42f9da-f693-4bc9-96de-bb6e531060a7&dmin=21097&dmax=21098" --pages 3

# Probar sin escribir nada en Supabase
npm run import:dry -- https://www.finishers.com/es/evento/maraton-de-malaga

# Borrar carreras con fecha pasada (fila + GPX). Revisa antes con prune:dry
npm run prune:dry
npm run prune
```

Opciones útiles: `--headed` para ver el navegador (con `--slow-mo 300` por defecto) y
`--help` para la lista completa.

## Notas

- El scraping depende del HTML de finishers.com (textos como "Ver o descargar el mapa",
  pestañas por distancia, popups). Si cambian la web, habrá que ajustar los selectores.
- Los slugs de distancias con espacios salen sin guion (`...-mediamaratn`) por un regex
  antiguo. Se mantiene así a propósito: cambiarlo duplicaría las filas ya importadas.
