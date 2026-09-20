import { describe, expect, it } from "vitest";
import { calculateDistanceMeters, formatDistance, projectLocationAheadOfBus, projectLocationToRoute } from "../src/js/core/geo-utils.js";

describe("utilidades geográficas", () => {
  it("calcula aproximadamente un grado de latitud", () => {
    const distance = calculateDistanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(112_000);
  });

  it("formatea distancias cortas en metros", () => {
    expect(formatDistance(321.4)).toBe("321 m");
  });

  it("formatea distancias largas en kilómetros", () => {
    expect(formatDistance(1_250)).toBe("1.3 km");
  });

  it("proyecta una ubicación sobre el recorrido y calcula su distancia acumulada", () => {
    const route = {
      points: [[0, 0], [0, 0.001], [0, 0.002]],
      cumulativeDistances: [0, 111.32, 222.64],
    };
    const projection = projectLocationToRoute({ lat: 0.0001, lng: 0.0015 }, route);
    expect(projection.segmentIndex).toBe(1);
    expect(projection.progress).toBeCloseTo(0.5);
    expect(projection.distanceMeters).toBeCloseTo(166.98);
    expect(projection.distanceFromRoute).toBeCloseTo(11.132);
  });

  it("elige el próximo tramo cuando una ruta pasa dos veces por la misma ubicación", () => {
    const route = {
      points: [[0, 0], [0, 0.001], [0.001, 0.001], [0, 0.001], [0, 0]],
      cumulativeDistances: [0, 100, 200, 300, 400],
      totalDistanceMeters: 400,
    };
    const projection = projectLocationAheadOfBus({ lat: 0, lng: 0.0005 }, route, 250);
    expect(projection.distanceMeters).toBeCloseTo(350);
    expect(projection.distanceAhead).toBeCloseTo(100);
  });
});
