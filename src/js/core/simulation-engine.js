const clampProgress = (progress) => Math.max(0, Math.min(progress, 0.999999));

export function interpolatePoint(start, end, progress) {
  const normalizedProgress = clampProgress(progress);
  return [
    start[0] + (end[0] - start[0]) * normalizedProgress,
    start[1] + (end[1] - start[1]) * normalizedProgress,
  ];
}

export function createInitialState(bus, route) {
  if (route.totalDistanceMeters) {
    return positionAtDistance({ ...bus, distanceMeters: route.totalDistanceMeters * bus.initialOffset }, route);
  }
  const totalSegments = route.points.length;
  const routePosition = bus.initialOffset * totalSegments;
  return advanceBus({ ...bus, segmentIndex: Math.floor(routePosition) % totalSegments, progress: routePosition - Math.floor(routePosition) }, route, 0);
}

export function advanceBus(busState, route, elapsedMs) {
  if (route.totalDistanceMeters) {
    const distanceMeters = ((busState.distanceMeters ?? 0) + route.speedMetersPerSecond * (elapsedMs / 1000)) % route.totalDistanceMeters;
    return positionAtDistance({ ...busState, distanceMeters }, route);
  }
  const totalSegments = route.points.length;
  const stepPerInterval = 0.035;
  let segmentIndex = busState.segmentIndex;
  let progress = busState.progress + stepPerInterval * (elapsedMs / 3000);

  while (progress >= 1) {
    progress -= 1;
    segmentIndex = (segmentIndex + 1) % totalSegments;
  }

  const start = route.points[segmentIndex];
  const end = route.points[(segmentIndex + 1) % totalSegments];
  const [lat, lng] = interpolatePoint(start, end, progress);

  return { ...busState, segmentIndex, progress, lat, lng };
}

export function positionAtDistance(busState, route) {
  const distanceMeters = ((busState.distanceMeters % route.totalDistanceMeters) + route.totalDistanceMeters) % route.totalDistanceMeters;
  let segmentIndex = 0;
  while (segmentIndex < route.cumulativeDistances.length - 2 && route.cumulativeDistances[segmentIndex + 1] < distanceMeters) segmentIndex += 1;
  const segmentStart = route.cumulativeDistances[segmentIndex];
  const segmentEnd = route.cumulativeDistances[segmentIndex + 1];
  const progress = segmentEnd === segmentStart ? 0 : (distanceMeters - segmentStart) / (segmentEnd - segmentStart);
  const [lat, lng] = interpolatePoint(route.points[segmentIndex], route.points[segmentIndex + 1], progress);
  return { ...busState, distanceMeters, segmentIndex, progress, lat, lng };
}
