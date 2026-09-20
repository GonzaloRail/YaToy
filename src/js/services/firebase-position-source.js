import { onValue, ref } from "firebase/database";
import { advanceBus, createInitialState } from "../core/simulation-engine.js";
import { database } from "../firebase/firebase-app.js";

export class FirebasePositionSource {
  constructor({ routes, buses, intervalMs }) {
    this.routes = routes;
    this.intervalMs = intervalMs;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.unsubscribePositions = null;
    this.unsubscribeConnection = null;
    this.statusTimer = null;
    this.fallbackTimer = null;
    this.lastFallbackTickAt = null;
    this.connected = false;
    this.remotePositions = {};
    this.fallbackPositions = Object.fromEntries(
      Object.values(buses).map((bus) => [bus.id, createInitialState(bus, routes[bus.routeId])]),
    );
    this.positions = { ...this.fallbackPositions };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    if (Object.keys(this.positions).length) listener(this.positions, this.getLatestUpdate());
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  start() {
    if (this.unsubscribePositions) return;
    this.unsubscribePositions = onValue(ref(database, "posicionesBuses"), (snapshot) => {
      const rawPositions = snapshot.val() ?? {};
      this.remotePositions = Object.fromEntries(Object.entries(rawPositions).map(([busId, position]) => [busId, {
        ...position,
        segmentIndex: position.indiceSegmento,
        progress: position.progreso,
        distanceMeters: position.distanciaMetros ?? position.distanceMeters,
      }]));
      this.refreshPositions();
      const updatedAt = this.getLatestUpdate();
      this.listeners.forEach((listener) => listener(this.positions, updatedAt));
      this.connected = true;
      this.emitStatus();
    }, (error) => {
      this.connected = false;
      this.emitStatus({ connected: false, error });
    });
    this.unsubscribeConnection = onValue(ref(database, ".info/connected"), (snapshot) => {
      this.connected = snapshot.val() === true;
      this.emitStatus();
    });
    this.statusTimer = window.setInterval(() => this.emitStatus(), 3_000);
    this.lastFallbackTickAt = performance.now();
    this.fallbackTimer = window.setInterval(() => this.tickFallback(), this.intervalMs);
  }

  stop() {
    this.unsubscribePositions?.();
    this.unsubscribeConnection?.();
    window.clearInterval(this.statusTimer);
    window.clearInterval(this.fallbackTimer);
    this.unsubscribePositions = null;
    this.unsubscribeConnection = null;
    this.statusTimer = null;
    this.fallbackTimer = null;
  }

  refreshPositions() {
    this.positions = { ...this.fallbackPositions, ...this.remotePositions };
  }

  tickFallback() {
    const now = performance.now();
    const elapsedMs = now - this.lastFallbackTickAt;
    this.lastFallbackTickAt = now;
    this.fallbackPositions = Object.fromEntries(
      Object.entries(this.fallbackPositions).map(([busId, state]) => this.remotePositions[busId]
        ? [busId, state]
        : [busId, advanceBus(state, this.routes[state.routeId], elapsedMs)]),
    );
    this.refreshPositions();
    this.listeners.forEach((listener) => listener(this.positions, Date.now()));
  }

  getLatestUpdate() {
    return Math.max(0, ...Object.values(this.positions).map((position) => position.actualizadoEn ?? 0));
  }

  emitStatus(status = {}) {
    const updatedAt = status.updatedAt ?? this.getLatestUpdate();
    this.statusListeners.forEach((listener) => listener({
      connected: status.connected ?? this.connected,
      updatedAt,
      error: status.error,
    }));
  }
}
