import "leaflet/dist/leaflet.css";
import "../css/main.css";
import { APP_CONFIG } from "./config/app-config.js";
import { buses } from "./data/buses.js";
import { companies } from "./data/companies.js";
import { routes } from "./data/routes.js";
import { calculateEtaSeconds, formatEta } from "./core/eta-calculator.js";
import { calculateDistanceMeters, formatDistance } from "./core/geo-utils.js";
import { validateNetwork } from "./core/validators.js";
import { MapController } from "./map/map-controller.js";
import { getCurrentLocation } from "./services/geolocation-service.js";
import { LocalPositionSource } from "./services/local-position-source.js";
import { populateBusSelector, populateRouteSelector } from "./ui/route-selector.js";
import { formatUpdateTime } from "./ui/status-banner.js";
import { findStop, populateStopSelector } from "./ui/stop-selector.js";

validateNetwork(routes, companies, buses);

const routeSelect = document.querySelector("#route-select");
const busSelect = document.querySelector("#bus-select");
const stopSelect = document.querySelector("#stop-select");
const locateUserButton = document.querySelector("#locate-user");
const clearSelectionButton = document.querySelector("#clear-selection");
const fitRoutesButton = document.querySelector("#fit-routes");
const visibleBusCount = document.querySelector("#visible-bus-count");
const busList = document.querySelector("#bus-list");
const routeLegend = document.querySelector("#route-legend");
const lastUpdate = document.querySelector("#last-update");
const liveRegion = document.querySelector("#live-region");
const etaMessage = document.querySelector("#eta-message");
const distanceMessage = document.querySelector("#distance-message");
let latestPositions = {};
let userLocation = null;

populateRouteSelector(routeSelect, routes);
populateBusSelector(busSelect, buses, routes, "all");

Object.values(routes).forEach((route) => {
  const item = document.createElement("li");
  item.innerHTML = `<span class="route-swatch" style="--route-color: ${route.color}" aria-hidden="true"></span>${route.code}`;
  routeLegend.append(item);
});

const mapController = new MapController({
  elementId: "map",
  center: APP_CONFIG.mapCenter,
  zoom: APP_CONFIG.mapInitialZoom,
  routes,
  buses,
});

const positionSource = new LocalPositionSource({ routes, buses, intervalMs: APP_CONFIG.simulationIntervalMs });

function visibleBuses() {
  return Object.values(buses).filter((bus) =>
    (routeSelect.value === "all" || bus.routeId === routeSelect.value) &&
    (busSelect.value === "all" || bus.id === busSelect.value),
  );
}

function updateBusSummary() {
  const visible = visibleBuses();
  visibleBusCount.textContent = `${visible.length} ${visible.length === 1 ? "bus visible" : "buses visibles"} en el mapa`;
  busList.replaceChildren();
  visible.forEach((bus) => {
    const route = routes[bus.routeId];
    const item = document.createElement("li");
    item.innerHTML = `<span class="route-swatch" style="--route-color: ${route.color}" aria-hidden="true"></span><span><strong>${bus.name}</strong><small>${route.code}</small></span>`;
    busList.append(item);
  });
}

function applySelection({ focusBus = false } = {}) {
  mapController.applyFilter(routeSelect.value, busSelect.value);
  updateBusSummary();
  if (focusBus && busSelect.value !== "all") mapController.focusBus(busSelect.value);
  updateEta();
}

function getSelectedRoute() {
  return routeSelect.value === "all" ? null : routes[routeSelect.value];
}

function updateEta() {
  const route = getSelectedRoute();
  const stop = findStop(route, stopSelect.value);
  const busPosition = latestPositions[busSelect.value];
  if (!route || busSelect.value === "all" || !stop || !busPosition) {
    etaMessage.textContent = "Selecciona una ruta, un bus y un paradero para ver el ETA.";
  } else {
    const etaSeconds = calculateEtaSeconds(busPosition, stop.pointIndex, route.points.length, route.secondsPerSegment);
    etaMessage.textContent = `${buses[busSelect.value].name}: ${formatEta(etaSeconds)}.`;
  }

  if (!userLocation || !route || !stop) {
    distanceMessage.textContent = "Activa tu ubicación para calcular la distancia al paradero.";
    return;
  }
  const [lat, lng] = route.points[stop.pointIndex];
  distanceMessage.textContent = `Estás a ${formatDistance(calculateDistanceMeters(userLocation, { lat, lng }))} del paradero.`;
}

function selectStop(routeId, stopId) {
  if (routeSelect.value !== routeId) {
    routeSelect.value = routeId;
    populateBusSelector(busSelect, buses, routes, routeId);
    populateStopSelector(stopSelect, routes[routeId]);
  }
  stopSelect.value = stopId;
  mapController.highlightStop(routeId, stopId);
  applySelection();
  liveRegion.textContent = `Paradero seleccionado: ${findStop(routes[routeId], stopId).name}.`;
}

routeSelect.addEventListener("change", () => {
  populateBusSelector(busSelect, buses, routes, routeSelect.value);
  populateStopSelector(stopSelect, getSelectedRoute());
  applySelection();
  liveRegion.textContent = routeSelect.value === "all" ? "Mostrando todas las rutas." : `Mostrando ${routes[routeSelect.value].code}.`;
});

busSelect.addEventListener("change", () => applySelection({ focusBus: true }));

stopSelect.addEventListener("change", () => {
  const route = getSelectedRoute();
  if (!route || !stopSelect.value) {
    updateEta();
    return;
  }
  mapController.highlightStop(route.id, stopSelect.value);
  updateEta();
});

locateUserButton.addEventListener("click", async () => {
  locateUserButton.disabled = true;
  locateUserButton.textContent = "Buscando ubicación...";
  try {
    userLocation = await getCurrentLocation();
    mapController.showUserLocation(userLocation);
    mapController.focusUserLocation();
    updateEta();
    liveRegion.textContent = "Ubicación actualizada. Solo se usa en este navegador.";
  } catch (error) {
    liveRegion.textContent = error.message;
    distanceMessage.textContent = error.message;
  } finally {
    locateUserButton.disabled = false;
    locateUserButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-4.6-4.6a6.5 6.5 0 1 0 0 9.2M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" /></svg>Usar mi ubicación';
  }
});

clearSelectionButton.addEventListener("click", () => {
  routeSelect.value = "all";
  populateBusSelector(busSelect, buses, routes, "all");
  populateStopSelector(stopSelect, null);
  applySelection();
  mapController.fitRoutes();
  liveRegion.textContent = "Mostrando todas las rutas y buses.";
});

fitRoutesButton.addEventListener("click", () => mapController.fitRoutes());

positionSource.subscribe((positions, updatedAt) => {
  latestPositions = positions;
  mapController.updatePositions(positions);
  lastUpdate.textContent = `Última actualización local: ${formatUpdateTime(updatedAt)}`;
  updateEta();
});

mapController.setStopSelectionHandler(selectStop);
applySelection();
positionSource.start();

window.addEventListener("beforeunload", () => positionSource.stop());
