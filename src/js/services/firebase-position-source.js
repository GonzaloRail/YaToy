import { onValue, ref } from "firebase/database";
import { database } from "../firebase/firebase-app.js";

export class FirebasePositionSource {
  constructor() {
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.unsubscribePositions = null;
    this.unsubscribeConnection = null;
    this.statusTimer = null;
    this.connected = false;
    this.positions = {};
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
      this.positions = Object.fromEntries(Object.entries(rawPositions).map(([busId, position]) => [busId, {
        ...position,
        segmentIndex: position.indiceSegmento,
        progress: position.progreso,
      }]));
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
  }

  stop() {
    this.unsubscribePositions?.();
    this.unsubscribeConnection?.();
    window.clearInterval(this.statusTimer);
    this.unsubscribePositions = null;
    this.unsubscribeConnection = null;
    this.statusTimer = null;
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
