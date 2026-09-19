// Coordenadas académicas aproximadas. No representan trazados ni paraderos oficiales.
export const routes = {
  c2: {
    id: "c2",
    code: "C-2",
    name: "Ruta C-2",
    color: "#2563eb",
    esAproximada: true,
    secondsPerSegment: 90,
    points: [
      [-16.379, -71.535], [-16.383, -71.539], [-16.389, -71.542],
      [-16.396, -71.541], [-16.401, -71.54], [-16.405, -71.536],
      [-16.401, -71.532], [-16.395, -71.531], [-16.389, -71.532],
      [-16.383, -71.533],
    ],
    stops: [
      { id: "rio-seco", name: "Terminal Río Seco", pointIndex: 0 },
      { id: "ejercito", name: "Av. Ejército", pointIndex: 3 },
      { id: "plaza-armas-c2", name: "Plaza de Armas", pointIndex: 6 },
    ],
  },
  troncal1: {
    id: "troncal1",
    code: "Troncal 1",
    name: "Ruta Troncal 1",
    color: "#ea580c",
    esAproximada: true,
    secondsPerSegment: 90,
    points: [
      [-16.429, -71.521], [-16.423, -71.525], [-16.417, -71.529],
      [-16.411, -71.533], [-16.405, -71.537], [-16.398, -71.538],
      [-16.391, -71.538], [-16.384, -71.537], [-16.378, -71.534],
      [-16.383, -71.53], [-16.39, -71.529], [-16.398, -71.531],
      [-16.406, -71.529], [-16.414, -71.525], [-16.422, -71.52],
    ],
    stops: [
      { id: "paucarpata", name: "Paucarpata", pointIndex: 0 },
      { id: "centro-civico", name: "Centro Cívico", pointIndex: 5 },
      { id: "cayma", name: "Cayma", pointIndex: 8 },
      { id: "yanahuara", name: "Yanahuara", pointIndex: 11 },
    ],
  },
  c10: {
    id: "c10",
    code: "C-10",
    name: "Ruta C-10",
    color: "#0891b2",
    esAproximada: true,
    secondsPerSegment: 90,
    points: [
      [-16.419, -71.551], [-16.414, -71.547], [-16.409, -71.544],
      [-16.403, -71.54], [-16.398, -71.536], [-16.396, -71.531],
      [-16.399, -71.526], [-16.405, -71.524], [-16.412, -71.526],
      [-16.419, -71.531], [-16.422, -71.538], [-16.422, -71.546],
    ],
    stops: [
      { id: "hunter", name: "Jacobo Hunter", pointIndex: 0 },
      { id: "plaza-armas-c10", name: "Plaza de Armas", pointIndex: 4 },
      { id: "mariano-melgar", name: "Mariano Melgar", pointIndex: 8 },
    ],
  },
};
