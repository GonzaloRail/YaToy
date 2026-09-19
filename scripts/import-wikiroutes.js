import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WIKIROUTES_BASE_URL = "https://wikiroutes.info";
const OSRM_BASE_URL = "https://router.project-osrm.org";
const CACHE_DIRECTORY = resolve(".cache/wikiroutes");
const OUTPUT_DIRECTORY = resolve("public/data/routes");
const URBAN_CODE = /^(A|BT|T)\s?\d+$/i;

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "YaToy-academic-prototype/1.0" } });
  if (!response.ok) throw new Error(`No se pudo consultar ${url}: ${response.status}`);
  return response.text();
}

function normalizeText(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export function parseCatalog(html) {
  const routes = new Map();
  const expression = /<a\b([^>]*href="\/es\/arequipa\?routes=(\d+)"[^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(expression)) {
    const routeId = match[2];
    const titleMatch = match[1].match(/title=['"]([^'"]+)['"]/i);
    const code = normalizeText(titleMatch?.[1] ?? match[3]);
    if (!URBAN_CODE.test(code)) continue;
    routes.set(routeId, {
      id: routeId,
      code: code.replace(/\s+/g, " "),
      sourceUrl: `${WIKIROUTES_BASE_URL}/es/arequipa?routes=${routeId}`,
      available: false,
    });
  }
  return [...routes.values()].sort((first, second) => first.code.localeCompare(second.code, "es", { numeric: true }));
}

export function parseDirections(html) {
  const sections = html.split(/<h2[^>]*>/i).slice(1);
  return sections.map((section) => {
    const title = normalizeText(section.split(/<\/h2>/i)[0]);
    if (!title.includes("—")) return null;
    const beforeSchedule = section.split(/Fechas y Días de Operación/i)[0];
    const stops = [...beforeSchedule.matchAll(/href="\/es\/stops\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => ({ id: match[1], name: normalizeText(match[2]) }))
      .filter((stop, index, allStops) => index === 0 || stop.id !== allStops[index - 1].id);
    return stops.length > 1 ? { name: title, stops } : null;
  }).filter(Boolean).slice(0, 2);
}

export function parseStopCoordinates(html) {
  const match = html.match(/cbll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

async function loadStop(stop) {
  const cacheFile = resolve(CACHE_DIRECTORY, `${stop.id}.json`);
  try {
    return JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {
    const html = await fetchText(`${WIKIROUTES_BASE_URL}/es/stops/${stop.id}`);
    const coordinates = parseStopCoordinates(html);
    if (!coordinates) throw new Error(`No se encontraron coordenadas para el paradero ${stop.name}.`);
    const result = { ...stop, ...coordinates };
    await writeFile(cacheFile, JSON.stringify(result));
    await sleep(350);
    return result;
  }
}

async function buildRoadGeometry(stops) {
  const coordinates = stops.map((stop) => `${stop.lng},${stop.lat}`).join(";");
  const url = new URL(`/route/v1/driving/${coordinates}`, OSRM_BASE_URL);
  url.search = new URLSearchParams({ overview: "full", geometries: "geojson", steps: "false" });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OSRM respondió ${response.status}.`);
  const data = await response.json();
  const geometry = data.routes?.[0]?.geometry?.coordinates;
  if (!geometry?.length) throw new Error("OSRM no devolvió geometría para este sentido.");
  return geometry.map(([lng, lat]) => [lat, lng]);
}

async function importRoute(routeId, code) {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const sourceUrl = `${WIKIROUTES_BASE_URL}/es/arequipa?routes=${routeId}`;
  const html = await fetchText(sourceUrl);
  const directions = parseDirections(html);
  if (!directions.length) throw new Error(`No se encontraron sentidos para ${code}.`);

  const importedDirections = [];
  for (const direction of directions) {
    const stops = [];
    for (const stop of direction.stops) stops.push(await loadStop(stop));
    let geometry = stops.map((stop) => [stop.lat, stop.lng]);
    let geometrySource = "stops";
    try {
      geometry = await buildRoadGeometry(stops);
      geometrySource = "osrm";
    } catch (error) {
      console.warn(`No se pudo generar geometría vial para ${direction.name}: ${error.message}`);
    }
    importedDirections.push({ id: slugify(direction.name), name: direction.name, geometrySource, geometry, stops });
  }

  const data = {
    id: String(routeId),
    code,
    source: "WikiRoutes public pages + OSRM",
    sourceUrl,
    importedAt: new Date().toISOString(),
    directions: importedDirections,
  };
  const outputFile = resolve(OUTPUT_DIRECTORY, `${slugify(code)}.json`);
  await writeFile(outputFile, JSON.stringify(data, null, 2));
  const catalogFile = resolve(OUTPUT_DIRECTORY, "catalog.json");
  try {
    const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
    catalog.routes = catalog.routes.map((route) => route.id === String(routeId)
      ? { ...route, available: true, dataFile: `${slugify(code)}.json` }
      : route);
    await writeFile(catalogFile, JSON.stringify(catalog, null, 2));
  } catch {
    // El catálogo puede importarse después de una ruta individual.
  }
  console.log(`Ruta ${code} importada en ${outputFile}.`);
}

async function importCatalog() {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const html = await fetchText(`${WIKIROUTES_BASE_URL}/es/arequipa/catalog`);
  const catalog = parseCatalog(html);
  await writeFile(resolve(OUTPUT_DIRECTORY, "catalog.json"), JSON.stringify({ source: `${WIKIROUTES_BASE_URL}/es/arequipa/catalog`, importedAt: new Date().toISOString(), routes: catalog }, null, 2));
  console.log(`Catálogo urbano importado: ${catalog.length} rutas.`);
}

const [command, routeId, ...codeParts] = process.argv.slice(2);
if (command === "catalog") await importCatalog();
else if (command === "route" && routeId && codeParts.length) await importRoute(routeId, codeParts.join(" "));
else console.log("Uso: node scripts/import-wikiroutes.js catalog | route <id-wikiroutes> <codigo>");
