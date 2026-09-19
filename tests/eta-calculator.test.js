import { describe, expect, it } from "vitest";
import { calculateDistanceAhead, calculateDistanceEtaSeconds, calculateEtaSeconds, calculateSegmentsRemaining, formatEta } from "../src/js/core/eta-calculator.js";

describe("cálculo de ETA", () => {
  it("calcula segmentos hasta un paradero adelante", () => {
    expect(calculateSegmentsRemaining({ segmentIndex: 1, progress: 0.25 }, 4, 6)).toBeCloseTo(2.75);
  });

  it("calcula segmentos al cerrar el circuito", () => {
    expect(calculateSegmentsRemaining({ segmentIndex: 5, progress: 0.5 }, 1, 6)).toBeCloseTo(1.5);
  });

  it("calcula segundos con un tiempo promedio configurable", () => {
    expect(calculateEtaSeconds({ segmentIndex: 0, progress: 0.5 }, 2, 5, 90)).toBeCloseTo(135);
  });

  it("formatea una llegada menor a un minuto", () => {
    expect(formatEta(59)).toBe("Llega en menos de 1 min");
  });

  it("redondea minutos de llegada hacia arriba", () => {
    expect(formatEta(121)).toBe("Llega en aproximadamente 3 min");
  });

  it("calcula ETA por metros y cierra el recorrido", () => {
    const route = { totalDistanceMeters: 1_000, speedMetersPerSecond: 5 };
    const stop = { distanceMeters: 100 };
    expect(calculateDistanceAhead(900, 100, 1_000)).toBe(200);
    expect(calculateDistanceEtaSeconds({ distanceMeters: 900 }, stop, route)).toBe(40);
  });
});
