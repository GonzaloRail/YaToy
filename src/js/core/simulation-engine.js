const clampProgress = (progress) => Math.max(0, Math.min(progress, 0.999999));

export function interpolatePoint(start, end, progress) {
  const normalizedProgress = clampProgress(progress);
  return [
    start[0] + (end[0] - start[0]) * normalizedProgress,
    start[1] + (end[1] - start[1]) * normalizedProgress,
  ];
}

export function createInitialState(bus, route) {
  const totalSegments = route.points.length;
  const routePosition = bus.initialOffset * totalSegments;
  const segmentIndex = Math.floor(routePosition) % totalSegments;
  const progress = routePosition - Math.floor(routePosition);
  return advanceBus({ ...bus, segmentIndex, progress }, route, 0);
}

export function advanceBus(busState, route, elapsedMs) {
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
