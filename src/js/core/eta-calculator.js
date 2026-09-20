export function calculateSegmentsRemaining(position, stopPointIndex, totalSegments) {
  const rawSegments = stopPointIndex - position.segmentIndex - position.progress;
  return (rawSegments + totalSegments) % totalSegments;
}

export function calculateEtaSeconds(position, stopPointIndex, totalSegments, secondsPerSegment) {
  return calculateSegmentsRemaining(position, stopPointIndex, totalSegments) * secondsPerSegment;
}

export function formatEta(etaSeconds) {
  if (!Number.isFinite(etaSeconds) || etaSeconds < 0) return "Tiempo de llegada no disponible";
  if (etaSeconds < 60) return `Llega en ${Math.max(0, Math.ceil(etaSeconds))} s`;
  return `Llega en aproximadamente ${Math.ceil(etaSeconds / 60)} min`;
}

export function calculateDistanceAhead(busDistanceMeters, stopDistanceMeters, totalDistanceMeters) {
  return (stopDistanceMeters - busDistanceMeters + totalDistanceMeters) % totalDistanceMeters;
}

export function calculateBusDistanceMeters(position, route) {
  if (Number.isFinite(position?.distanceMeters)) return position.distanceMeters;
  const segmentIndex = position?.segmentIndex;
  const progress = position?.progress;
  const segmentStart = route.cumulativeDistances?.[segmentIndex];
  const segmentEnd = route.cumulativeDistances?.[segmentIndex + 1];
  if (!Number.isFinite(progress) || !Number.isFinite(segmentStart) || !Number.isFinite(segmentEnd)) return null;
  return segmentStart + (segmentEnd - segmentStart) * progress;
}

export function calculateDistanceEtaSeconds(position, stop, route) {
  const distanceAhead = calculateDistanceAhead(position.distanceMeters, stop.distanceMeters, route.totalDistanceMeters);
  return distanceAhead / route.speedMetersPerSecond;
}
