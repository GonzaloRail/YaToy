import "../css/admin.css";
import { get, onValue, ref, runTransaction, serverTimestamp, update } from "firebase/database";
import { APP_CONFIG } from "./config/app-config.js";
import { createInitialState, advanceBus } from "./core/simulation-engine.js";
import { buses } from "./data/buses.js";
import { routes } from "./data/routes.js";
import { observeAuthState } from "./firebase/auth-service.js";
import { database } from "./firebase/firebase-app.js";
import { formatUpdateTime } from "./ui/status-banner.js";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const LEASE_DURATION_MS = 10_000;
const sessionId = crypto.randomUUID();
const accessMessage = document.querySelector("#admin-access-message");
const controls = document.querySelector("#admin-controls");
const simulatorStatus = document.querySelector("#simulator-status");
const leaseStatus = document.querySelector("#lease-status");
const writeStatus = document.querySelector("#write-status");
const feedback = document.querySelector("#admin-feedback");
const startButton = document.querySelector("#start-simulation");
const pauseButton = document.querySelector("#pause-simulation");
const resetButton = document.querySelector("#reset-simulation");
const controlRef = ref(database, "simulacion/control");

let simulationTimer = null;
let lastTickAt = null;
let states = {};
let controlState = null;

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("is-error", isError);
}

function isLeaseOwner() {
  return controlState?.propietarioId === sessionId && controlState?.leaseExpiraEn > Date.now();
}

function renderControlState() {
  const isActive = controlState?.activa === true && controlState?.leaseExpiraEn > Date.now();
  simulatorStatus.textContent = isActive ? "Activo" : "Detenido";
  leaseStatus.textContent = isLeaseOwner() ? "Esta sesión" : isActive ? "Otra sesión" : "Disponible";
  writeStatus.textContent = controlState?.ultimaActualizacion ? formatUpdateTime(controlState.ultimaActualizacion) : "Sin actualizaciones";
  startButton.disabled = isActive && !isLeaseOwner();
  pauseButton.disabled = !isLeaseOwner();
  resetButton.disabled = isActive && !isLeaseOwner();
}

function stopLocalTimer() {
  window.clearInterval(simulationTimer);
  simulationTimer = null;
}

async function loadStates() {
  const snapshot = await get(ref(database, "posicionesBuses"));
  const persisted = snapshot.val() ?? {};
  states = Object.fromEntries(Object.values(buses).map((bus) => {
    const position = persisted[bus.id];
    if (!position) return [bus.id, createInitialState(bus, routes[bus.routeId])];
    return [bus.id, {
      ...bus,
      segmentIndex: position.indiceSegmento,
      progress: position.progreso,
      lat: position.lat,
      lng: position.lng,
    }];
  }));
}

async function acquireLease() {
  const result = await runTransaction(controlRef, (current) => {
    const now = Date.now();
    if (current?.activa && current.leaseExpiraEn > now && current.propietarioId !== sessionId) return;
    return {
      activa: true,
      intervaloMs: APP_CONFIG.simulationIntervalMs,
      propietarioId: sessionId,
      leaseExpiraEn: now + LEASE_DURATION_MS,
      ultimaActualizacion: now,
    };
  });
  controlState = result.snapshot.val();
  return result.committed && controlState?.propietarioId === sessionId;
}

async function writePositions() {
  const updates = {
    "simulacion/control/activa": true,
    "simulacion/control/intervaloMs": APP_CONFIG.simulationIntervalMs,
    "simulacion/control/leaseExpiraEn": Date.now() + LEASE_DURATION_MS,
    "simulacion/control/ultimaActualizacion": serverTimestamp(),
  };
  Object.entries(states).forEach(([busId, state]) => {
    updates[`posicionesBuses/${busId}`] = {
      rutaId: state.routeId,
      indiceSegmento: state.segmentIndex,
      progreso: state.progress,
      lat: state.lat,
      lng: state.lng,
      actualizadoEn: serverTimestamp(),
      simuladorId: sessionId,
    };
  });
  await update(ref(database), updates);
}

async function tick() {
  if (!isLeaseOwner()) {
    stopLocalTimer();
    setFeedback("La simulación fue tomada por otra sesión.", true);
    return;
  }
  const now = performance.now();
  const elapsedMs = now - lastTickAt;
  lastTickAt = now;
  states = Object.fromEntries(Object.entries(states).map(([busId, state]) => [
    busId,
    advanceBus(state, routes[state.routeId], elapsedMs),
  ]));
  await writePositions();
  setFeedback(`Se actualizaron ${Object.keys(states).length} buses.`);
}

async function startSimulation() {
  startButton.disabled = true;
  try {
    if (!await acquireLease()) {
      setFeedback("Otra sesión administra la simulación en este momento.", true);
      return;
    }
    await loadStates();
    lastTickAt = performance.now();
    await tick();
    stopLocalTimer();
    simulationTimer = window.setInterval(() => void tick(), APP_CONFIG.simulationIntervalMs);
  } catch (error) {
    console.error("No fue posible iniciar la simulación:", error);
    const message = error.code === "PERMISSION_DENIED"
      ? "Firebase rechazó la operación. Verifica que ingresaste con la cuenta administradora."
      : "No fue posible iniciar la simulación. Revisa la conexión y vuelve a intentarlo.";
    setFeedback(message, true);
  } finally {
    startButton.disabled = false;
  }
}

async function pauseSimulation() {
  if (!isLeaseOwner()) return;
  stopLocalTimer();
  try {
    await update(ref(database), {
      "simulacion/control/activa": false,
      "simulacion/control/leaseExpiraEn": Date.now(),
      "simulacion/control/ultimaActualizacion": serverTimestamp(),
    });
    setFeedback("Simulación pausada. Otra sesión podrá iniciarla.");
  } catch (error) {
    setFeedback("No fue posible pausar la simulación.", true);
  }
}

async function resetSimulation() {
  if (!isLeaseOwner() && !await acquireLease()) {
    setFeedback("Otra sesión administra la simulación en este momento.", true);
    return;
  }
  states = Object.fromEntries(Object.values(buses).map((bus) => [bus.id, createInitialState(bus, routes[bus.routeId])]));
  try {
    await writePositions();
    setFeedback("Las posiciones iniciales se restauraron.");
  } catch (error) {
    setFeedback("No fue posible reiniciar las posiciones.", true);
  }
}

startButton.addEventListener("click", () => void startSimulation());
pauseButton.addEventListener("click", () => void pauseSimulation());
resetButton.addEventListener("click", () => void resetSimulation());
window.addEventListener("pagehide", stopLocalTimer);

observeAuthState((user) => {
  if (!user) {
    accessMessage.textContent = "Inicia sesión en el mapa principal antes de acceder a este panel.";
    controls.hidden = true;
    return;
  }
  if (user.uid !== ADMIN_UID) {
    accessMessage.textContent = "Tu cuenta no tiene permiso para administrar la simulación.";
    controls.hidden = true;
    return;
  }
  accessMessage.textContent = `Sesión administradora: ${user.email}.`;
  controls.hidden = false;
  onValue(controlRef, (snapshot) => {
    controlState = snapshot.val();
    if (simulationTimer && !isLeaseOwner()) stopLocalTimer();
    renderControlState();
  });
});
