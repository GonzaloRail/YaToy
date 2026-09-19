import L from "leaflet";

export class MapController {
  constructor({ elementId, center, zoom, routes, buses }) {
    this.routes = routes;
    this.buses = buses;
    this.map = L.map(elementId, { zoomControl: false }).setView(center, zoom);
    this.routeLayers = new Map();
    this.stopLayers = new Map();
    this.busMarkers = new Map();
    this.userMarker = null;
    this.userAccuracyCircle = null;
    this.selectedStop = null;
    this.stopSelectionHandler = null;
    this.routeBounds = L.latLngBounds([]);

    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);

    this.drawRoutes();
    this.createBusMarkers();
    this.fitRoutes();
  }

  drawRoutes() {
    Object.values(this.routes).forEach((route) => {
      const polyline = L.polyline(route.points, {
        color: route.color,
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).bindTooltip(`${route.code} · trazado aproximado`, { sticky: true });
      polyline.addTo(this.map);
      this.routeLayers.set(route.id, polyline);
      this.routeBounds.extend(polyline.getBounds());

      const stops = route.stops.map((stop) => {
        const marker = L.circleMarker(route.points[stop.pointIndex], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: route.color,
          fillOpacity: 1,
        }).bindTooltip(stop.name, { direction: "top" });
        marker.on("click", () => this.stopSelectionHandler?.(route.id, stop.id));
        marker.addTo(this.map);
        return { stop, marker };
      });
      this.stopLayers.set(route.id, stops);
    });
  }

  createBusMarkers() {
    Object.values(this.buses).forEach((bus) => {
      const route = this.routes[bus.routeId];
      const icon = L.divIcon({
        className: "bus-marker-wrapper",
        html: `<span class="bus-marker" style="--bus-color: ${route.color}" aria-hidden="true">BUS</span>`,
        iconSize: [42, 30],
        iconAnchor: [21, 15],
      });
      const marker = L.marker([0, 0], { icon, keyboard: true, title: `${bus.name}, ${route.code}` })
        .bindPopup(`<strong>${bus.name}</strong><br>${route.code}<br><small>Posición simulada</small>`)
        .addTo(this.map);
      this.busMarkers.set(bus.id, marker);
    });
  }

  updatePositions(positions) {
    Object.entries(positions).forEach(([busId, position]) => {
      this.busMarkers.get(busId)?.setLatLng([position.lat, position.lng]);
    });
  }

  applyFilter(routeId, busId) {
    Object.values(this.routes).forEach((route) => {
      const isRouteVisible = routeId === "all" || route.id === routeId;
      const routeLayer = this.routeLayers.get(route.id);
      routeLayer.setStyle({ opacity: isRouteVisible ? 0.9 : 0.12, weight: isRouteVisible ? 6 : 3 });
      this.stopLayers.get(route.id).forEach(({ marker }) => marker.setStyle({ opacity: isRouteVisible ? 1 : 0.15, fillOpacity: isRouteVisible ? 1 : 0.15 }));
    });

    Object.values(this.buses).forEach((bus) => {
      const isVisible = (routeId === "all" || bus.routeId === routeId) && (busId === "all" || bus.id === busId);
      const marker = this.busMarkers.get(bus.id);
      marker.setOpacity(isVisible ? 1 : 0.15);
      marker.getElement()?.classList.toggle("is-selected", busId === bus.id);
    });
  }

  focusBus(busId) {
    const marker = this.busMarkers.get(busId);
    if (!marker) return;
    this.map.flyTo(marker.getLatLng(), 15, { duration: 0.5 });
    marker.openPopup();
  }

  fitRoutes() {
    this.map.fitBounds(this.routeBounds, { padding: [40, 40] });
  }

  setStopSelectionHandler(handler) {
    this.stopSelectionHandler = handler;
  }

  highlightStop(routeId, stopId) {
    this.stopLayers.forEach((stops, currentRouteId) => {
      stops.forEach(({ stop, marker }) => {
        const isSelected = currentRouteId === routeId && stop.id === stopId;
        marker.setStyle({ radius: isSelected ? 9 : 6, weight: isSelected ? 3 : 2 });
        if (isSelected) marker.openTooltip();
      });
    });
    this.selectedStop = { routeId, stopId };
  }

  showUserLocation(location) {
    const latLng = [location.lat, location.lng];
    if (!this.userMarker) {
      this.userMarker = L.circleMarker(latLng, {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#0f172a",
        fillOpacity: 1,
      }).bindTooltip("Tu ubicación", { direction: "top" }).addTo(this.map);
      this.userAccuracyCircle = L.circle(latLng, { radius: location.accuracy, color: "#0f172a", weight: 1, fillColor: "#64748b", fillOpacity: 0.12 }).addTo(this.map);
      return;
    }
    this.userMarker.setLatLng(latLng);
    this.userAccuracyCircle.setLatLng(latLng).setRadius(location.accuracy);
  }

  focusUserLocation() {
    if (this.userMarker) this.map.flyTo(this.userMarker.getLatLng(), 16, { duration: 0.5 });
  }
}
