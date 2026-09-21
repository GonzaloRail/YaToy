import "../css/admin.css";
import { onValue, ref, serverTimestamp, update } from "firebase/database";
import { observeAuthState } from "./firebase/auth-service.js";
import { database } from "./firebase/firebase-app.js";
import { formatUpdateTime } from "./ui/status-banner.js";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
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

let controlState = null;
let serverTimeOffset = 0;

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("is-error", isError);
}

function getServerTime() {
  return Date.now() + serverTimeOffset;
}

function getElapsedMs() {
  const savedElapsed = Number(controlState?.transcurridoMs) || 0;
  if (!controlState?.activa || !Number.isFinite(controlState?.inicioEn)) return savedElapsed;
  return savedElapsed + Math.max(0, getServerTime() - controlState.inicioEn);
}

function renderControlState() {
  const isActive = controlState?.activa === true;
  simulatorStatus.textContent = isActive ? "Activo" : "Detenido";
  leaseStatus.textContent = "Global";
  writeStatus.textContent = controlState?.ultimaActualizacion ? formatUpdateTime(controlState.ultimaActualizacion) : "Sin actualizaciones";
  startButton.disabled = isActive;
  pauseButton.disabled = !isActive;
  resetButton.disabled = false;
}

async function startSimulation() {
  startButton.disabled = true;
  try {
    await update(controlRef, {
      activa: true,
      inicioEn: serverTimestamp(),
      transcurridoMs: Number(controlState?.transcurridoMs) || 0,
      ultimaActualizacion: serverTimestamp(),
    });
    setFeedback("Simulación iniciada para todos los usuarios.");
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
  try {
    await update(controlRef, {
      activa: false,
      transcurridoMs: getElapsedMs(),
      ultimaActualizacion: serverTimestamp(),
    });
    setFeedback("Simulación pausada para todos los usuarios.");
  } catch (error) {
    setFeedback("No fue posible pausar la simulación.", true);
  }
}

async function resetSimulation() {
  try {
    await update(controlRef, {
      inicioEn: serverTimestamp(),
      transcurridoMs: 0,
      ultimaActualizacion: serverTimestamp(),
    });
    setFeedback(controlState?.activa ? "Las posiciones se reiniciaron y la simulación continúa." : "Las posiciones iniciales se restauraron.");
  } catch (error) {
    setFeedback("No fue posible reiniciar las posiciones.", true);
  }
}

startButton.addEventListener("click", () => void startSimulation());
pauseButton.addEventListener("click", () => void pauseSimulation());
resetButton.addEventListener("click", () => void resetSimulation());

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
  onValue(ref(database, ".info/serverTimeOffset"), (snapshot) => {
    serverTimeOffset = snapshot.val() ?? 0;
  });
  onValue(controlRef, (snapshot) => {
    controlState = snapshot.val();
    renderControlState();
  });
});
