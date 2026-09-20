import { describe, expect, it } from "vitest";
import { buses } from "../src/js/data/buses.js";
import { companies } from "../src/js/data/companies.js";
import { routes } from "../src/js/data/routes.js";
import { validateNetwork } from "../src/js/core/validators.js";

describe("validación de la red local", () => {
  it("acepta las once rutas y sus buses simulados", () => {
    expect(() => validateNetwork(routes, companies, buses)).not.toThrow();
    expect(Object.keys(buses)).toHaveLength(33);
    expect(Object.keys(routes)).toHaveLength(11);
    expect(Object.keys(routes)).toContain("a1");
    expect(Object.keys(routes)).toContain("a11");
  });

  it("rechaza un bus asociado a una ruta inexistente", () => {
    const invalidBuses = { bus: { id: "bus", companyId: "empresaA", routeId: "inexistente" } };
    expect(() => validateNetwork(routes, companies, invalidBuses)).toThrow("ruta inexistente");
  });
});
