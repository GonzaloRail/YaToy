const EARTH_RADIUS_METERS = 6_371_000;

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceMeters(from, to) {
  const latitudeDelta = degreesToRadians(to.lat - from.lat);
  const longitudeDelta = degreesToRadians(to.lng - from.lng);
  const fromLatitude = degreesToRadians(from.lat);
  const toLatitude = degreesToRadians(to.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRouteProjections(location, route) {
  const latitudeScale = 111_320;
  const longitudeScale = latitudeScale * Math.cos(degreesToRadians(location.lat));
  const projections = [];

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const [startLat, startLng] = route.points[index];
    const [endLat, endLng] = route.points[index + 1];
    const startX = (startLng - location.lng) * longitudeScale;
    const startY = (startLat - location.lat) * latitudeScale;
    const deltaX = (endLng - startLng) * longitudeScale;
    const deltaY = (endLat - startLat) * latitudeScale;
    const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;
    const progress = segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / segmentLengthSquared));
    const projectedX = startX + deltaX * progress;
    const projectedY = startY + deltaY * progress;
    const distanceFromRoute = Math.hypot(projectedX, projectedY);

    const segmentStartDistance = route.cumulativeDistances?.[index] ?? 0;
    const segmentEndDistance = route.cumulativeDistances?.[index + 1]
      ?? segmentStartDistance + Math.sqrt(segmentLengthSquared);
    projections.push({
      lat: startLat + (endLat - startLat) * progress,
      lng: startLng + (endLng - startLng) * progress,
      segmentIndex: index,
      progress,
      distanceMeters: segmentStartDistance + (segmentEndDistance - segmentStartDistance) * progress,
      distanceFromRoute,
    });
  }

  return projections;
}

export function projectLocationToRoute(location, route) {
  return getRouteProjections(location, route)
    .sort((first, second) => first.distanceFromRoute - second.distanceFromRoute)[0] ?? null;
}

export function projectLocationAheadOfBus(location, route, busDistanceMeters) {
  const projections = getRouteProjections(location, route);
  const closestDistance = Math.min(...projections.map((projection) => projection.distanceFromRoute));
  return projections
    .filter((projection) => projection.distanceFromRoute <= closestDistance + 25)
    .map((projection) => ({
      ...projection,
      distanceAhead: (projection.distanceMeters - busDistanceMeters + route.totalDistanceMeters) % route.totalDistanceMeters,
    }))
    .sort((first, second) => first.distanceAhead - second.distanceAhead)[0] ?? null;
}

export function formatDistance(distanceMeters) {
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1_000).toFixed(1)} km`;
}
