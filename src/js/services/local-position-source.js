import { advanceBus, createInitialState } from "../core/simulation-engine.js";

export class LocalPositionSource {
  constructor({ routes, buses, intervalMs }) {
    this.routes = routes;
    this.intervalMs = intervalMs;
    this.listeners = new Set();
    this.timer = null;
    this.lastTickAt = null;
    this.positions = Object.fromEntries(
      Object.values(buses).map((bus) => [bus.id, createInitialState(bus, routes[bus.routeId])]),
    );
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.positions, Date.now());
    return () => this.listeners.delete(listener);
  }

  start() {
    if (this.timer) return;
    this.lastTickAt = performance.now();
    this.timer = window.setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    const now = performance.now();
    const elapsedMs = now - this.lastTickAt;
    this.lastTickAt = now;
    this.positions = Object.fromEntries(
      Object.entries(this.positions).map(([busId, busState]) => [
        busId,
        advanceBus(busState, this.routes[busState.routeId], elapsedMs),
      ]),
    );
    this.emit(Date.now());
  }

  emit(updatedAt) {
    this.listeners.forEach((listener) => listener(this.positions, updatedAt));
  }
}
