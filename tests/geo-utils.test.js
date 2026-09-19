import { describe, expect, it } from "vitest";
import { calculateDistanceMeters, formatDistance } from "../src/js/core/geo-utils.js";

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
});
