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
    this.userEstimateVisible = false;
    this.selectedStop = null;
    this.stopSelectionHandler = null;
    this.userLocationHandler = null;
    this.routeBounds = L.latLngBounds([]);

    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);

    this.drawRoutes();
    this.createBusMarkers();
    this.fitRoutes();
    this.map.on("click", (event) => {
      this.userLocationHandler?.({ lat: event.latlng.lat, lng: event.latlng.lng, accuracy: 20 });
    });
  }

  drawRoutes() {
    Object.values(this.routes).forEach((route) => {
      const polyline = L.polyline(route.points, {
        color: route.color,
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).bindTooltip(`${route.code} · ${route.esAproximada ? "trazado aproximado" : "recorrido vial importado"}`, { sticky: true });
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
        html: `<span class="bus-marker" style="--bus-color: ${route.color}" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 4h18a3 3 0 0 1 3 3v16H4V7a3 3 0 0 1 3-3Zm1 5v7h16V9H8Zm2 17a3 3 0 0 0-6 0h6Zm18 0a3 3 0 0 0-6 0h6ZM8 20h2v2H8v-2Zm14 0h2v2h-2v-2Z"/></svg><b>${route.code}</b></span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
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

  setUserLocationHandler(handler) {
    this.userLocationHandler = handler;
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
      const icon = L.divIcon({
        className: "user-marker-wrapper",
        html: '<span class="user-marker" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 10.2A3.2 3.2 0 1 1 12 5.8a3.2 3.2 0 0 1 0 6.4Z"/></svg></span>',
        iconSize: [36, 44],
        iconAnchor: [18, 40],
      });
      this.userMarker = L.marker(latLng, { icon, draggable: true, autoPan: true, title: "Tu ubicación" })
        .bindTooltip(`
          <div class="user-location-card__content">
            <strong>Tu ubicación</strong>
            <span>Ubicación seleccionada</span>
          </div>`, {
          direction: "top",
          offset: [0, -28],
          permanent: true,
          opacity: 1,
          className: "user-location-card",
        })
        .addTo(this.map);
      this.userEstimateVisible = true;
      this.userMarker.on("dragend", () => {
        const point = this.userMarker.getLatLng();
        this.userLocationHandler?.({ lat: point.lat, lng: point.lng, accuracy: 20 });
      });
      this.userAccuracyCircle = L.circle(latLng, { radius: location.accuracy, color: "#0f172a", weight: 1, fillColor: "#64748b", fillOpacity: 0.12 }).addTo(this.map);
      return;
    }
    this.userMarker.setLatLng(latLng);
    this.userAccuracyCircle.setLatLng(latLng).setRadius(location.accuracy);
  }

  showUserEstimate({ eta, details }) {
    if (!this.userMarker) return;
    const content = `
      <div class="user-location-card__content">
        <strong>Tu ubicación</strong>
        <span>${eta}</span>
        ${details.map((detail) => `<span>${detail}</span>`).join("")}
      </div>`;
    if (!this.userEstimateVisible) {
      this.userMarker.unbindTooltip().bindTooltip(content, {
        direction: "top",
        offset: [0, -28],
        permanent: true,
        opacity: 1,
        className: "user-location-card",
      });
      this.userEstimateVisible = true;
      return;
    }
    this.userMarker.setTooltipContent(content);
  }

  focusUserLocation() {
    if (this.userMarker) this.map.flyTo(this.userMarker.getLatLng(), 16, { duration: 0.5 });
  }
}
