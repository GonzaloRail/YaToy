import { onValue, ref } from "firebase/database";
import { createPositionsAtElapsedTime } from "../core/simulation-engine.js";
import { database } from "../firebase/firebase-app.js";

export class FirebasePositionSource {
  constructor({ routes, buses, intervalMs }) {
    this.routes = routes;
    this.intervalMs = intervalMs;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.unsubscribeControl = null;
    this.unsubscribeConnection = null;
    this.unsubscribeServerTimeOffset = null;
    this.statusTimer = null;
    this.positionTimer = null;
    this.connected = false;
    this.serverTimeOffset = 0;
    this.control = null;
    this.buses = buses;
    this.positions = createPositionsAtElapsedTime(buses, routes, 0);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    if (Object.keys(this.positions).length) listener(this.positions, this.getServerTime());
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  start() {
    if (this.unsubscribeControl) return;
    this.unsubscribeControl = onValue(ref(database, "simulacion/control"), (snapshot) => {
      this.control = snapshot.val();
      this.tick();
      this.emitStatus();
    }, (error) => {
      this.connected = false;
      this.emitStatus({ connected: false, error });
    });
    this.unsubscribeConnection = onValue(ref(database, ".info/connected"), (snapshot) => {
      this.connected = snapshot.val() === true;
      this.emitStatus();
    });
    this.unsubscribeServerTimeOffset = onValue(ref(database, ".info/serverTimeOffset"), (snapshot) => {
      this.serverTimeOffset = snapshot.val() ?? 0;
      this.tick();
    });
    this.statusTimer = window.setInterval(() => this.emitStatus(), 3_000);
    this.positionTimer = window.setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    this.unsubscribeControl?.();
    this.unsubscribeConnection?.();
    this.unsubscribeServerTimeOffset?.();
    window.clearInterval(this.statusTimer);
    window.clearInterval(this.positionTimer);
    this.unsubscribeControl = null;
    this.unsubscribeConnection = null;
    this.unsubscribeServerTimeOffset = null;
    this.statusTimer = null;
    this.positionTimer = null;
  }

  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }

  getElapsedMs() {
    const elapsedBeforeStart = Number(this.control?.transcurridoMs) || 0;
    if (!this.control?.activa || !Number.isFinite(this.control?.inicioEn)) return elapsedBeforeStart;
    return elapsedBeforeStart + Math.max(0, this.getServerTime() - this.control.inicioEn);
  }

  tick() {
    const updatedAt = this.getServerTime();
    this.positions = createPositionsAtElapsedTime(this.buses, this.routes, this.getElapsedMs());
    this.listeners.forEach((listener) => listener(this.positions, updatedAt));
  }

  emitStatus(status = {}) {
    const updatedAt = status.updatedAt ?? this.getServerTime();
    this.statusListeners.forEach((listener) => listener({
      connected: status.connected ?? this.connected,
      updatedAt,
      error: status.error,
      active: this.control?.activa === true,
    }));
  }
}
