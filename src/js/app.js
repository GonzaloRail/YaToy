import "leaflet/dist/leaflet.css";
import "../css/main.css";
import { APP_CONFIG } from "./config/app-config.js";
import { buses } from "./data/buses.js";
import { companies } from "./data/companies.js";
import { routes } from "./data/routes.js";
import { calculateDistanceEtaSeconds, calculateEtaSeconds, formatEta } from "./core/eta-calculator.js";
import { calculateDistanceMeters, formatDistance } from "./core/geo-utils.js";
import { validateNetwork } from "./core/validators.js";
import { getAuthErrorMessage, loginUser, logoutUser, observeAuthState, registerUser } from "./firebase/auth-service.js";
import { MapController } from "./map/map-controller.js";
import { getCurrentLocation } from "./services/geolocation-service.js";
import { FirebasePositionSource } from "./services/firebase-position-source.js";
import { LocalPositionSource } from "./services/local-position-source.js";
import { clearHistory, recordSearch, setFavorite, subscribeToFavorites, subscribeToHistory } from "./services/user-data-service.js";
import { populateBusSelector, populateRouteSelector } from "./ui/route-selector.js";
import { formatUpdateTime } from "./ui/status-banner.js";
import { findStop, populateStopSelector } from "./ui/stop-selector.js";
import { setAuthFeedback, setAuthMode, setFormBusy } from "./ui/auth-dialog.js";

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
const liveIndicator = document.querySelector("#live-indicator");
const liveRegion = document.querySelector("#live-region");
const etaMessage = document.querySelector("#eta-message");
const distanceMessage = document.querySelector("#distance-message");
const authDialog = document.querySelector("#auth-dialog");
const openAuthButton = document.querySelector("#open-auth");
const closeAuthButton = document.querySelector("#close-auth");
const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const authFeedback = document.querySelector("#auth-feedback");
const sessionActions = document.querySelector("#session-actions");
const sessionName = document.querySelector("#session-name");
const logoutButton = document.querySelector("#logout");
const authGate = document.querySelector("#auth-gate");
const authenticatedApp = document.querySelector("#authenticated-app");
const openAuthGateButton = document.querySelector("#open-auth-gate");
const controlPanel = document.querySelector("#control-panel");
const sheetToggle = document.querySelector("#sheet-toggle");
const chooseLocationButton = document.querySelector("#choose-location");
const confirmLocationButton = document.querySelector("#confirm-location");
const locationHelp = document.querySelector("#location-help");
const routeSearch = document.querySelector("#route-search");
const catalogList = document.querySelector("#catalog-list");
const catalogFeedback = document.querySelector("#catalog-feedback");
const userData = document.querySelector("#user-data");
const favoriteRouteButton = document.querySelector("#favorite-route");
const favoriteStopButton = document.querySelector("#favorite-stop");
const favoritesList = document.querySelector("#favorites-list");
const historyList = document.querySelector("#history-list");
const clearHistoryButton = document.querySelector("#clear-history");
const userDataFeedback = document.querySelector("#user-data-feedback");
let latestPositions = {};
let userLocation = null;
let currentUser = null;
let favorites = {};
let unsubscribeFavorites = null;
let unsubscribeHistory = null;
let lastSearchKey = null;
let lastSearchAt = 0;
let mapController = null;
let positionSource = null;
let appInitialized = false;
let routeCatalog = [];

populateRouteSelector(routeSelect, routes);
populateBusSelector(busSelect, buses, routes, "all");

Object.values(routes).forEach((route) => {
  const item = document.createElement("li");
  item.innerHTML = `<span class="route-swatch" style="--route-color: ${route.color}" aria-hidden="true"></span>${route.code}`;
  routeLegend.append(item);
});

function initializeAuthenticatedApp() {
  if (appInitialized) return;
  mapController = new MapController({
    elementId: "map",
    center: APP_CONFIG.mapCenter,
    zoom: APP_CONFIG.mapInitialZoom,
    routes,
    buses,
  });
  mapController.setStopSelectionHandler(selectStop);
  mapController.setUserLocationHandler(setUserLocation);
  positionSource = APP_CONFIG.positionSource === "firebase"
    ? new FirebasePositionSource()
    : new LocalPositionSource({ routes, buses, intervalMs: APP_CONFIG.simulationIntervalMs });
  positionSource.subscribe((positions, updatedAt) => {
    latestPositions = positions;
    mapController?.updatePositions(positions);
    if (APP_CONFIG.positionSource === "firebase" && !updatedAt) {
      lastUpdate.textContent = "Esperando que el administrador inicie la simulación.";
    } else {
      const sourceLabel = APP_CONFIG.positionSource === "firebase" ? "sincronizada" : "local";
      lastUpdate.textContent = `Última actualización ${sourceLabel}: ${formatUpdateTime(updatedAt)}`;
    }
    updateEta();
  });
  positionSource.subscribeStatus?.(({ connected, updatedAt, error }) => {
    const isStale = updatedAt > 0 && Date.now() - updatedAt > APP_CONFIG.stalePositionMs;
    liveIndicator.textContent = error || !connected ? "Sin conexión" : isStale ? "Datos desactualizados" : "Activa";
    liveIndicator.classList.toggle("is-warning", isStale);
    liveIndicator.classList.toggle("is-offline", Boolean(error) || !connected);
  });
  positionSource.start();
  appInitialized = true;
  applySelection();
  void loadRouteCatalog();
}

function teardownAuthenticatedApp() {
  if (!appInitialized) return;
  positionSource?.stop();
  mapController?.map.remove();
  document.querySelector("#map").replaceChildren();
  mapController = null;
  positionSource = null;
  latestPositions = {};
  userLocation = null;
  appInitialized = false;
}

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
  mapController?.applyFilter(routeSelect.value, busSelect.value);
  updateBusSummary();
  if (focusBus && busSelect.value !== "all") mapController?.focusBus(busSelect.value);
  updateEta();
  updateFavoriteControls();
}

function getSelectedRoute() {
  return routeSelect.value === "all" ? null : routes[routeSelect.value];
}

function updateEta() {
  const route = getSelectedRoute();
  let stop = findStop(route, stopSelect.value);
  if (userLocation && route) {
    const routeDistance = Math.min(...route.points.map(([lat, lng]) => calculateDistanceMeters(userLocation, { lat, lng })));
    if (routeDistance > 400) {
      etaMessage.textContent = `Estás a ${formatDistance(routeDistance)} del recorrido ${route.code}.`;
      distanceMessage.textContent = "Puedes ver la ruta y sus buses, pero no hay un paradero cercano para estimar llegada.";
      return;
    }
    if (!stop) {
      stop = route.stops.reduce((closest, candidate) => {
        const [lat, lng] = route.points[candidate.pointIndex];
        const [closestLat, closestLng] = route.points[closest.pointIndex];
        return calculateDistanceMeters(userLocation, { lat, lng }) < calculateDistanceMeters(userLocation, { lat: closestLat, lng: closestLng }) ? candidate : closest;
      });
      stopSelect.value = stop.id;
      mapController?.highlightStop(route.id, stop.id);
    }
  }
  const routeBusIds = Object.values(buses).filter((bus) => bus.routeId === route?.id && latestPositions[bus.id]);
  const candidateBusIds = busSelect.value === "all" ? routeBusIds.map((bus) => bus.id) : [busSelect.value];
  if (!route || !stop || !candidateBusIds.length) {
    etaMessage.textContent = "Selecciona una ruta, un bus y un paradero para ver el ETA.";
  } else {
    const nextBus = candidateBusIds.map((busId) => {
      const position = latestPositions[busId];
      const etaSeconds = route.totalDistanceMeters
        ? calculateDistanceEtaSeconds(position, stop, route)
        : calculateEtaSeconds(position, stop.pointIndex, route.points.length, route.secondsPerSegment);
      return { busId, etaSeconds };
    }).sort((first, second) => first.etaSeconds - second.etaSeconds)[0];
    etaMessage.textContent = `${buses[nextBus.busId].name}: ${formatEta(nextBus.etaSeconds)}.`;
  }

  if (!userLocation || !route || !stop) {
    distanceMessage.textContent = "Activa tu ubicación para calcular la distancia al paradero.";
    return;
  }
  const [lat, lng] = route.points[stop.pointIndex];
  distanceMessage.textContent = `Estás a ${formatDistance(calculateDistanceMeters(userLocation, { lat, lng }))} del paradero.`;
}

async function loadRouteCatalog() {
  if (routeCatalog.length) return;
  try {
    const response = await fetch("./data/routes/catalog.json");
    if (!response.ok) throw new Error("No se pudo cargar el catálogo.");
    const catalog = await response.json();
    routeCatalog = catalog.routes ?? [];
    renderCatalog();
  } catch (error) {
    catalogFeedback.textContent = "No se pudo cargar el catálogo de rutas.";
  }
}

function renderCatalog() {
  const term = routeSearch.value.trim().toLowerCase();
  const visible = routeCatalog.filter((route) => route.code.toLowerCase().includes(term)).slice(0, 30);
  catalogList.replaceChildren();
  visible.forEach((catalogRoute) => {
    const localRoute = Object.values(routes).find((route) => route.code === catalogRoute.code);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = localRoute ? `${catalogRoute.code} · recorrido disponible` : `${catalogRoute.code} · pendiente de importar`;
    button.disabled = !localRoute;
    button.classList.toggle("is-available", Boolean(localRoute));
    button.addEventListener("click", () => {
      routeSelect.value = localRoute.id;
      populateBusSelector(busSelect, buses, routes, localRoute.id);
      populateStopSelector(stopSelect, localRoute);
      applySelection();
      mapController?.fitRoutes();
      catalogFeedback.textContent = `${catalogRoute.code} cargada desde WikiRoutes.`;
    });
    item.append(button);
    catalogList.append(item);
  });
  if (!visible.length) catalogFeedback.textContent = "No se encontraron rutas con ese código.";
}

routeSearch.addEventListener("input", renderCatalog);

function getSelectedStop() {
  return findStop(getSelectedRoute(), stopSelect.value);
}

function updateFavoriteControls() {
  const route = getSelectedRoute();
  const stop = getSelectedStop();
  favoriteRouteButton.disabled = !currentUser || !route;
  favoriteStopButton.disabled = !currentUser || !stop;
  favoriteRouteButton.textContent = route && favorites.rutas?.[route.id] ? "Quitar ruta guardada" : "Guardar ruta";
  favoriteStopButton.textContent = stop && favorites.paraderos?.[stop.id] ? "Quitar paradero guardado" : "Guardar paradero";
}

function setUserDataFeedback(message, isError = false) {
  userDataFeedback.textContent = message;
  userDataFeedback.classList.toggle("is-error", isError);
}

function addEmptyItem(list, text) {
  const item = document.createElement("li");
  item.className = "empty-item";
  item.textContent = text;
  list.append(item);
}

function renderFavorites() {
  favoritesList.replaceChildren();
  const favoriteRoutes = Object.keys(favorites.rutas ?? {}).map((routeId) => routes[routeId]).filter(Boolean);
  const favoriteStops = Object.keys(favorites.paraderos ?? {}).map((stopId) => {
    const route = Object.values(routes).find((candidate) => candidate.stops.some((stop) => stop.id === stopId));
    return route ? { route, stop: findStop(route, stopId) } : null;
  }).filter(Boolean);
  if (!favoriteRoutes.length && !favoriteStops.length) {
    addEmptyItem(favoritesList, "Aún no tienes favoritos.");
    return;
  }
  favoriteRoutes.forEach((route) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Ruta ${route.code}`;
    button.addEventListener("click", () => {
      routeSelect.value = route.id;
      populateBusSelector(busSelect, buses, routes, route.id);
      populateStopSelector(stopSelect, route);
      applySelection();
    });
    item.append(button);
    favoritesList.append(item);
  });
  favoriteStops.forEach(({ route, stop }) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${stop.name} · ${route.code}`;
    button.addEventListener("click", () => selectStop(route.id, stop.id));
    item.append(button);
    favoritesList.append(item);
  });
}

function renderHistory(entries) {
  historyList.replaceChildren();
  if (!entries.length) {
    addEmptyItem(historyList, "Aún no tienes búsquedas guardadas.");
    return;
  }
  entries.forEach((entry) => {
    const route = routes[entry.rutaId];
    const bus = buses[entry.busId];
    const stop = findStop(route, entry.paraderoId);
    if (!route || !bus || !stop) return;
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${route.code} · ${bus.name} · ${stop.name}`;
    button.addEventListener("click", () => {
      routeSelect.value = route.id;
      populateBusSelector(busSelect, buses, routes, route.id);
      busSelect.value = bus.id;
      selectStop(route.id, stop.id);
      applySelection({ focusBus: true });
    });
    item.append(button);
    historyList.append(item);
  });
}

async function maybeRecordSearch() {
  const route = getSelectedRoute();
  const stop = getSelectedStop();
  if (!currentUser || !route || !stop || busSelect.value === "all") return;
  const search = { rutaId: route.id, busId: busSelect.value, paraderoId: stop.id };
  const key = Object.values(search).join("/");
  if (key === lastSearchKey && Date.now() - lastSearchAt < 5_000) return;
  lastSearchKey = key;
  lastSearchAt = Date.now();
  try {
    await recordSearch(currentUser.uid, search);
  } catch (error) {
    liveRegion.textContent = "No fue posible guardar el historial en este momento.";
  }
}

function selectStop(routeId, stopId) {
  if (routeSelect.value !== routeId) {
    routeSelect.value = routeId;
    populateBusSelector(busSelect, buses, routes, routeId);
    populateStopSelector(stopSelect, routes[routeId]);
  }
  stopSelect.value = stopId;
  mapController?.highlightStop(routeId, stopId);
  applySelection();
  void maybeRecordSearch();
  liveRegion.textContent = `Paradero seleccionado: ${findStop(routes[routeId], stopId).name}.`;
}

routeSelect.addEventListener("change", () => {
  populateBusSelector(busSelect, buses, routes, routeSelect.value);
  populateStopSelector(stopSelect, getSelectedRoute());
  applySelection();
  liveRegion.textContent = routeSelect.value === "all" ? "Mostrando todas las rutas." : `Mostrando ${routes[routeSelect.value].code}.`;
});

busSelect.addEventListener("change", () => applySelection({ focusBus: true }));
busSelect.addEventListener("change", () => void maybeRecordSearch());

stopSelect.addEventListener("change", () => {
  const route = getSelectedRoute();
  if (!route || !stopSelect.value) {
    updateEta();
    return;
  }
  mapController?.highlightStop(route.id, stopSelect.value);
  updateEta();
  void maybeRecordSearch();
});

favoriteRouteButton.addEventListener("click", async () => {
  const route = getSelectedRoute();
  if (!currentUser || !route) return;
  try {
    const willSave = !favorites.rutas?.[route.id];
    await setFavorite(currentUser.uid, "rutas", route.id, willSave);
    setUserDataFeedback(willSave ? `Ruta ${route.code} guardada.` : `Ruta ${route.code} eliminada.`);
  } catch (error) {
    setUserDataFeedback("No fue posible actualizar la ruta guardada.", true);
  }
});

favoriteStopButton.addEventListener("click", async () => {
  const stop = getSelectedStop();
  if (!currentUser || !stop) return;
  try {
    const willSave = !favorites.paraderos?.[stop.id];
    await setFavorite(currentUser.uid, "paraderos", stop.id, willSave);
    setUserDataFeedback(willSave ? `Paradero ${stop.name} guardado.` : `Paradero ${stop.name} eliminado.`);
  } catch (error) {
    setUserDataFeedback("No fue posible actualizar el paradero guardado.", true);
  }
});

clearHistoryButton.addEventListener("click", async () => {
  if (!currentUser || !window.confirm("¿Quieres eliminar todo tu historial de búsquedas?")) return;
  clearHistoryButton.disabled = true;
  try {
    await clearHistory(currentUser.uid);
    setUserDataFeedback("Historial eliminado.");
  } catch (error) {
    setUserDataFeedback("No fue posible eliminar el historial.", true);
  } finally {
    clearHistoryButton.disabled = false;
  }
});

function setUserLocation(location) {
  userLocation = location;
  mapController?.showUserLocation(location);
  updateEta();
  confirmLocationButton.hidden = false;
  locationHelp.textContent = "Puedes arrastrar el pin para ajustar la ubicación y luego confirmarla.";
}

locateUserButton.addEventListener("click", async () => {
  locateUserButton.disabled = true;
  locateUserButton.textContent = "Buscando ubicación...";
  try {
    setUserLocation(await getCurrentLocation());
    mapController?.focusUserLocation();
    mapController?.endLocationSelection();
    confirmLocationButton.hidden = true;
    locationHelp.textContent = "Ubicación del dispositivo activada. Puedes cambiarla eligiendo un punto en el mapa.";
    liveRegion.textContent = "Ubicación actualizada. Solo se usa en este navegador.";
  } catch (error) {
    liveRegion.textContent = error.message;
    distanceMessage.textContent = error.message;
  } finally {
    locateUserButton.disabled = false;
    locateUserButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-4.6-4.6a6.5 6.5 0 1 0 0 9.2M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" /></svg>Usar mi ubicación';
  }
});

chooseLocationButton.addEventListener("click", () => {
  mapController?.beginLocationSelection();
  locationHelp.textContent = "Toca cualquier punto del mapa para ubicarte. Después puedes arrastrar el pin.";
  confirmLocationButton.hidden = true;
});

confirmLocationButton.addEventListener("click", () => {
  if (!userLocation) return;
  mapController?.endLocationSelection();
  confirmLocationButton.hidden = true;
  locationHelp.textContent = "Ubicación manual confirmada.";
  liveRegion.textContent = "Ubicación manual confirmada.";
});

function setSheetState(state) {
  if (window.matchMedia("(min-width: 768px)").matches) return;
  controlPanel.dataset.sheet = state;
  sheetToggle.setAttribute("aria-expanded", String(state === "expanded"));
  sheetToggle.setAttribute("aria-label", state === "expanded" ? "Contraer panel" : "Expandir panel");
}

sheetToggle.addEventListener("click", () => {
  const nextState = controlPanel.dataset.sheet === "collapsed" ? "mid"
    : controlPanel.dataset.sheet === "mid" ? "expanded"
      : "mid";
  setSheetState(nextState);
});

let sheetStartY = null;
sheetToggle.addEventListener("pointerdown", (event) => {
  sheetStartY = event.clientY;
  sheetToggle.setPointerCapture(event.pointerId);
});
sheetToggle.addEventListener("pointerup", (event) => {
  if (sheetStartY === null) return;
  const movement = event.clientY - sheetStartY;
  sheetStartY = null;
  if (Math.abs(movement) < 36) return;
  setSheetState(movement > 0 ? "collapsed" : "expanded");
});

function openAuthentication(mode = "login") {
  setAuthMode(authDialog, mode);
  authDialog.showModal();
  document.querySelector("#login-email").focus();
}

openAuthButton.addEventListener("click", () => openAuthentication());
openAuthGateButton.addEventListener("click", () => openAuthentication());

closeAuthButton.addEventListener("click", () => authDialog.close());
loginTab.addEventListener("click", () => setAuthMode(authDialog, "login"));
registerTab.addEventListener("click", () => setAuthMode(authDialog, "register"));

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(`#${button.dataset.passwordTarget}`);
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    button.textContent = shouldShow ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-pressed", String(shouldShow));
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  setFormBusy(loginForm, true, "Ingresar");
  setAuthFeedback(authFeedback, "");
  try {
    await loginUser({ email: formData.get("email"), password: formData.get("password") });
    authDialog.close();
    loginForm.reset();
  } catch (error) {
    setAuthFeedback(authFeedback, getAuthErrorMessage(error), true);
  } finally {
    setFormBusy(loginForm, false, "Ingresar");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  setFormBusy(registerForm, true, "Crear cuenta");
  setAuthFeedback(authFeedback, "");
  try {
    await registerUser({
      name: formData.get("name").trim(),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    authDialog.close();
    registerForm.reset();
  } catch (error) {
    setAuthFeedback(authFeedback, getAuthErrorMessage(error), true);
  } finally {
    setFormBusy(registerForm, false, "Crear cuenta");
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await logoutUser();
  } catch (error) {
    liveRegion.textContent = getAuthErrorMessage(error);
  } finally {
    logoutButton.disabled = false;
  }
});

clearSelectionButton.addEventListener("click", () => {
  routeSelect.value = "all";
  populateBusSelector(busSelect, buses, routes, "all");
  populateStopSelector(stopSelect, null);
  applySelection();
  mapController?.fitRoutes();
  liveRegion.textContent = "Mostrando todas las rutas y buses.";
});

fitRoutesButton.addEventListener("click", () => mapController?.fitRoutes());

observeAuthState((user) => {
  unsubscribeFavorites?.();
  unsubscribeHistory?.();
  currentUser = user;
  const isAuthenticated = Boolean(user);
  authGate.hidden = isAuthenticated;
  authenticatedApp.hidden = !isAuthenticated;
  openAuthButton.hidden = isAuthenticated;
  sessionActions.hidden = !isAuthenticated;
  sessionName.textContent = user?.email ?? "";
  userData.hidden = !isAuthenticated;
  favorites = {};
  setUserDataFeedback("");
  favoritesList.replaceChildren();
  historyList.replaceChildren();
  if (!isAuthenticated) {
    teardownAuthenticatedApp();
    updateFavoriteControls();
    return;
  }
  if (authDialog.open) authDialog.close();
  initializeAuthenticatedApp();
  updateFavoriteControls();
  unsubscribeFavorites = subscribeToFavorites(user.uid, (nextFavorites) => {
    favorites = nextFavorites;
    renderFavorites();
    updateFavoriteControls();
  });
  unsubscribeHistory = subscribeToHistory(user.uid, renderHistory);
  liveRegion.textContent = "Sesión iniciada correctamente.";
});

window.addEventListener("beforeunload", () => positionSource?.stop());
