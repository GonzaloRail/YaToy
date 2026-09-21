import { describe, expect, it } from "vitest";
import { advanceBus, createInitialState, createPositionsAtElapsedTime, interpolatePoint } from "../src/js/core/simulation-engine.js";

const route = {
  points: [[0, 0], [0, 10], [10, 10]],
};

describe("motor de simulación", () => {
  it("interpela linealmente entre dos puntos", () => {
    expect(interpolatePoint([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });

  it("mantiene el bus en el mismo segmento con un avance pequeño", () => {
    const result = advanceBus({ routeId: "test", segmentIndex: 0, progress: 0.2 }, route, 3000);
    expect(result.segmentIndex).toBe(0);
    expect(result.progress).toBeCloseTo(0.235);
    expect(result.lng).toBeCloseTo(2.35);
  });

  it("avanza de segmento y conserva el excedente de progreso", () => {
    const result = advanceBus({ routeId: "test", segmentIndex: 0, progress: 0.98 }, route, 3000);
    expect(result.segmentIndex).toBe(1);
    expect(result.progress).toBeCloseTo(0.015);
    expect(result.lat).toBeCloseTo(0.15);
  });

  it("vuelve al primer segmento al terminar el circuito", () => {
    const result = advanceBus({ routeId: "test", segmentIndex: 2, progress: 0.98 }, route, 3000);
    expect(result.segmentIndex).toBe(0);
    expect(result.progress).toBeCloseTo(0.015);
    expect(result.lat).toBeCloseTo(0);
    expect(result.lng).toBeCloseTo(0.15);
  });

  it("crea una posición inicial a partir del offset del bus", () => {
    const result = createInitialState({ id: "bus", routeId: "test", initialOffset: 0.5 }, route);
    expect(result.segmentIndex).toBe(1);
    expect(result.progress).toBe(0.5);
    expect(result.lat).toBeCloseTo(5);
    expect(result.lng).toBeCloseTo(10);
  });

  it("avanza una ruta por metros y conserva el punto vial correcto", () => {
    const distanceRoute = {
      points: [[0, 0], [0, 1], [0, 2]],
      cumulativeDistances: [0, 100, 200],
      totalDistanceMeters: 200,
      speedMetersPerSecond: 10,
    };
    const result = advanceBus({ routeId: "distance", distanceMeters: 95 }, distanceRoute, 1_000);
    expect(result.distanceMeters).toBe(105);
    expect(result.segmentIndex).toBe(1);
    expect(result.progress).toBeCloseTo(0.05);
    expect(result.lng).toBeCloseTo(1.05);
  });

  it("reconstruye la misma posición desde el tiempo global de simulación", () => {
    const routes = {
      distance: {
        points: [[0, 0], [0, 1], [0, 2]],
        cumulativeDistances: [0, 100, 200],
        totalDistanceMeters: 200,
        speedMetersPerSecond: 10,
      },
    };
    const buses = { bus: { id: "bus", routeId: "distance", initialOffset: 0.25 } };

    const positions = createPositionsAtElapsedTime(buses, routes, 1_000);

    expect(positions.bus.distanceMeters).toBe(60);
    expect(positions.bus.lng).toBeCloseTo(0.6);
  });
});
