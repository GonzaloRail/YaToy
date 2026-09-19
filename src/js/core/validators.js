export function validateNetwork(routes, companies, buses) {
  Object.values(routes).forEach((route) => {
    if (!Array.isArray(route.points) || route.points.length < 2) {
      throw new Error(`La ruta ${route.id} requiere al menos dos puntos.`);
    }
  });

  Object.values(buses).forEach((bus) => {
    if (!routes[bus.routeId]) {
      throw new Error(`El bus ${bus.id} tiene una ruta inexistente.`);
    }
    if (!companies[bus.companyId]) {
      throw new Error(`El bus ${bus.id} tiene una empresa inexistente.`);
    }
    if (companies[bus.companyId].routeId !== bus.routeId) {
      throw new Error(`El bus ${bus.id} no coincide con la ruta de su empresa.`);
    }
  });
}
