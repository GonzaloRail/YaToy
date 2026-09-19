import { describe, expect, it } from "vitest";
import { buses } from "../src/js/data/buses.js";
import { companies } from "../src/js/data/companies.js";
import { routes } from "../src/js/data/routes.js";
import { validateNetwork } from "../src/js/core/validators.js";

describe("validación de la red local", () => {
  it("acepta las tres rutas y los nueve buses del prototipo", () => {
    expect(() => validateNetwork(routes, companies, buses)).not.toThrow();
    expect(Object.keys(buses)).toHaveLength(9);
  });

  it("rechaza un bus asociado a una ruta inexistente", () => {
    const invalidBuses = { bus: { id: "bus", companyId: "empresaA", routeId: "inexistente" } };
    expect(() => validateNetwork(routes, companies, invalidBuses)).toThrow("ruta inexistente");
  });
});
