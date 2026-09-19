export function calculateSegmentsRemaining(position, stopPointIndex, totalSegments) {
  const rawSegments = stopPointIndex - position.segmentIndex - position.progress;
  return (rawSegments + totalSegments) % totalSegments;
}

export function calculateEtaSeconds(position, stopPointIndex, totalSegments, secondsPerSegment) {
  return calculateSegmentsRemaining(position, stopPointIndex, totalSegments) * secondsPerSegment;
}

export function formatEta(etaSeconds) {
  if (etaSeconds < 60) return "Llega en menos de 1 min";
  return `Llega en aproximadamente ${Math.ceil(etaSeconds / 60)} min`;
}

export function calculateDistanceAhead(busDistanceMeters, stopDistanceMeters, totalDistanceMeters) {
  return (stopDistanceMeters - busDistanceMeters + totalDistanceMeters) % totalDistanceMeters;
}

export function calculateDistanceEtaSeconds(position, stop, route) {
  const distanceAhead = calculateDistanceAhead(position.distanceMeters, stop.distanceMeters, route.totalDistanceMeters);
  return distanceAhead / route.speedMetersPerSecond;
}
