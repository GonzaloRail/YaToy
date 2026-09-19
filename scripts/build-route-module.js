import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceFile = resolve("public/data/routes/a-1.json");
const routesOutput = resolve("src/js/data/routes.js");
const busesOutput = resolve("src/js/data/buses.js");
const companiesOutput = resolve("src/js/data/companies.js");
const seedOutput = resolve("data/seed-data.json");

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

const source = JSON.parse(await readFile(sourceFile, "utf8"));
const [outbound, inbound] = source.directions;
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

const route = {
  id: "a1",
  sourceId: source.id,
  code: source.code,
  name: source.directions.map((direction) => direction.name).join(" / "),
  agency: "COTUM Express S.A.C.",
  color: "#2563eb",
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

const companies = {
  cotum: { id: "cotum", name: "COTUM Express S.A.C.", routeId: "a1" },
};
const buses = {
  "a1-01": { id: "a1-01", name: "A 1-01", companyId: "cotum", routeId: "a1", initialOffset: 0 },
  "a1-02": { id: "a1-02", name: "A 1-02", companyId: "cotum", routeId: "a1", initialOffset: 0.34 },
  "a1-03": { id: "a1-03", name: "A 1-03", companyId: "cotum", routeId: "a1", initialOffset: 0.67 },
};

const initialPositions = Object.fromEntries(Object.values(buses).map((bus) => {
  const distanceMeters = route.totalDistanceMeters * bus.initialOffset;
  const pointIndex = cumulativeDistances.findIndex((distance) => distance >= distanceMeters);
  const index = pointIndex < 0 ? points.length - 1 : pointIndex;
  const [lat, lng] = points[index];
  return [bus.id, { rutaId: "a1", indiceSegmento: Math.max(0, index - 1), progreso: 0, distanciaMetros: distanceMeters, lat, lng, actualizadoEn: 0 }];
}));

await writeFile(routesOutput, `// Generado desde public/data/routes/a-1.json. No editar manualmente.\nexport const routes = ${JSON.stringify({ a1: route }, null, 2)};\n`);
await writeFile(companiesOutput, `export const companies = ${JSON.stringify(companies, null, 2)};\n`);
await writeFile(busesOutput, `export const buses = ${JSON.stringify(buses, null, 2)};\n`);
await writeFile(seedOutput, `${JSON.stringify({
  empresas: { cotum: { nombre: companies.cotum.name, rutaId: "a1", buses: Object.fromEntries(Object.keys(buses).map((id) => [id, true])) } },
  rutas: { a1: route },
  buses: Object.fromEntries(Object.entries(buses).map(([id, bus]) => [id, { nombre: bus.name, empresaId: bus.companyId, rutaId: bus.routeId, activo: true }])),
  posicionesBuses: initialPositions,
  simulacion: { control: { activa: false, intervaloMs: 3000, ultimaActualizacion: 0 } },
}, null, 2)}\n`);
console.log(`Generada A 1: ${(route.totalDistanceMeters / 1000).toFixed(1)} km, ${route.points.length} puntos, ${route.stops.length} paraderos.`);
