export function populateStopSelector(select, route) {
  select.replaceChildren(new Option("Selecciona un paradero", ""));
  if (!route) {
    select.disabled = true;
    return;
  }

  route.stops.forEach((stop) => select.add(new Option(stop.name, stop.id)));
  select.disabled = false;
}

export function findStop(route, stopId) {
  return route?.stops.find((stop) => stop.id === stopId) ?? null;
}
