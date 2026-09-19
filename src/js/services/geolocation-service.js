export function getCurrentLocation() {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Tu navegador no permite obtener ubicación."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (error) => {
        const messages = {
          1: "No autorizaste el uso de tu ubicación. Puedes seguir usando el mapa.",
          2: "No fue posible determinar tu ubicación. Inténtalo de nuevo.",
          3: "La ubicación tardó demasiado. Inténtalo de nuevo.",
        };
        reject(new Error(messages[error.code] ?? "No fue posible obtener tu ubicación."));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
