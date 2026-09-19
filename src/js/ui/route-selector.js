export function populateRouteSelector(select, routes) {
  Object.values(routes).forEach((route) => {
    const option = new Option(`${route.code} · ${route.name.replace("Ruta ", "")}`, route.id);
    select.add(option);
  });
}

export function populateBusSelector(select, buses, routes, selectedRouteId) {
  select.replaceChildren(new Option("Todos los buses", "all"));
  Object.values(buses)
    .filter((bus) => selectedRouteId === "all" || bus.routeId === selectedRouteId)
    .forEach((bus) => select.add(new Option(`${bus.name} · ${routes[bus.routeId].code}`, bus.id)));
}
