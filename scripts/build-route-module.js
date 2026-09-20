import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDirectory = resolve("public/data/routes");
const routesOutput = resolve("src/js/data/routes.js");
const busesOutput = resolve("src/js/data/buses.js");
const companiesOutput = resolve("src/js/data/companies.js");
const seedOutput = resolve("data/seed-data.json");
const routeColors = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#059669", "#7c3aed"];

function haversineMeters([lat1, lng1], [lat2, lng2]) {
  const radians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lng2 - lng1);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildDistanceData(points) {
  const cumulativeDistances = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulativeDistances.push(cumulativeDistances[index - 1] + haversineMeters(points[index - 1], points[index]));
  }
  return { cumulativeDistances, totalDistanceMeters: cumulativeDistances.at(-1) };
}

function nearestPointIndex(points, coordinate, offset = 0, length = points.length) {
  let closestIndex = offset;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = offset; index < offset + length; index += 1) {
    const distance = haversineMeters(points[index], coordinate);
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  }
  return closestIndex;
}

function toRouteId(code) {
  return code.toLowerCase().replace(/\s+/g, "");
}

function routeOrder(code) {
  const [prefix, number] = code.split(" ");
  return `${prefix === "A" ? "1" : prefix === "BT" ? "2" : "3"}${number.padStart(3, "0")}`;
}

function buildRoute(source, color) {
  const [outbound, inbound] = source.directions;
  if (!outbound || !inbound) throw new Error(`La ruta ${source.code} requiere dos sentidos.`);
  const points = [...outbound.geometry, ...inbound.geometry.slice(1)];
  const { cumulativeDistances, totalDistanceMeters } = buildDistanceData(points);
  const outboundStops = outbound.stops.map((stop) => {
    const pointIndex = nearestPointIndex(points, [stop.lat, stop.lng], 0, outbound.geometry.length);
    return { id: `${outbound.id}-${stop.id}`, name: stop.name, pointIndex, directionId: outbound.id, distanceMeters: cumulativeDistances[pointIndex] };
  });
  const inboundOffset = outbound.geometry.length - 1;
  const inboundStops = inbound.stops.map((stop) => {
    const pointIndex = nearestPointIndex(points, [stop.lat, stop.lng], inboundOffset, inbound.geometry.length);
    return { id: `${inbound.id}-${stop.id}`, name: stop.name, pointIndex, directionId: inbound.id, distanceMeters: cumulativeDistances[pointIndex] };
  });
  const routeId = toRouteId(source.code);
  return {
    id: routeId,
    sourceId: source.id,
    code: source.code,
    name: source.directions.map((direction) => direction.name).join(" / "),
    agency: routeId === "a1" ? "COTUM Express S.A.C." : "Operador pendiente de confirmar",
    color,
    esAproximada: false,
    source: source.source,
    sourceUrl: source.sourceUrl,
    speedMetersPerSecond: 6.5,
    points,
    cumulativeDistances,
    totalDistanceMeters,
    directions: source.directions.map((direction) => ({ id: direction.id, name: direction.name, geometrySource: direction.geometrySource })),
    stops: [...outboundStops, ...inboundStops],
  };
}

const files = (await readdir(sourceDirectory)).filter((file) => /^a-\d+\.json$/.test(file));
const sources = await Promise.all(files.map(async (file) => JSON.parse(await readFile(resolve(sourceDirectory, file), "utf8"))));
sources.sort((first, second) => routeOrder(first.code).localeCompare(routeOrder(second.code)));
const routes = Object.fromEntries(sources.map((source, index) => {
  const route = buildRoute(source, routeColors[index % routeColors.length]);
  return [route.id, route];
}));

const companies = Object.fromEntries(Object.values(routes).map((route) => {
  const isCotum = route.id === "a1";
  const id = isCotum ? "cotum" : `operador-${route.id}`;
  return [id, { id, name: route.agency, routeId: route.id, provisional: !isCotum }];
}));

const buses = Object.fromEntries(Object.values(routes).flatMap((route) => {
  const companyId = route.id === "a1" ? "cotum" : `operador-${route.id}`;
  return [0, 0.34, 0.67].map((initialOffset, index) => {
    const id = `${route.id}-${String(index + 1).padStart(2, "0")}`;
    return [id, { id, name: `${route.code}-${String(index + 1).padStart(2, "0")}`, companyId, routeId: route.id, initialOffset }];
  });
}));

const initialPositions = Object.fromEntries(Object.values(buses).map((bus) => {
  const route = routes[bus.routeId];
  const distanceMeters = route.totalDistanceMeters * bus.initialOffset;
  const pointIndex = route.cumulativeDistances.findIndex((distance) => distance >= distanceMeters);
  const index = pointIndex < 0 ? route.points.length - 1 : pointIndex;
  const [lat, lng] = route.points[index];
  return [bus.id, { rutaId: route.id, indiceSegmento: Math.max(0, index - 1), progreso: 0, distanciaMetros: distanceMeters, lat, lng, actualizadoEn: 0 }];
}));

await writeFile(routesOutput, `// Generado desde public/data/routes. No editar manualmente.\nexport const routes = ${JSON.stringify(routes, null, 2)};\n`);
await writeFile(companiesOutput, `// Generado desde las rutas importadas.\nexport const companies = ${JSON.stringify(companies, null, 2)};\n`);
await writeFile(busesOutput, `// Flota simulada inicial: tres buses por ruta.\nexport const buses = ${JSON.stringify(buses, null, 2)};\n`);
await writeFile(seedOutput, `${JSON.stringify({
  empresas: Object.fromEntries(Object.values(companies).map((company) => [company.id, {
    nombre: company.name,
    rutaId: company.routeId,
    provisional: company.provisional,
    buses: Object.fromEntries(Object.values(buses).filter((bus) => bus.companyId === company.id).map((bus) => [bus.id, true])),
  }])),
  rutas: routes,
  buses: Object.fromEntries(Object.entries(buses).map(([id, bus]) => [id, { nombre: bus.name, empresaId: bus.companyId, rutaId: bus.routeId, activo: true }])),
  posicionesBuses: initialPositions,
  simulacion: { control: { activa: false, intervaloMs: 3000, ultimaActualizacion: 0 } },
}, null, 2)}\n`);
console.log(`Generadas ${Object.keys(routes).length} rutas y ${Object.keys(buses).length} buses simulados.`);
