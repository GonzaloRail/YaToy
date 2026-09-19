export function formatUpdateTime(timestamp) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(timestamp);
}
