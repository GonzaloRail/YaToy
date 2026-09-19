export const APP_CONFIG = {
  simulationIntervalMs: 3000,
  positionSource: import.meta.env.VITE_POSITION_SOURCE ?? "local",
  stalePositionMs: 12_000,
  mapCenter: [-16.401, -71.536],
  mapInitialZoom: 13,
};
