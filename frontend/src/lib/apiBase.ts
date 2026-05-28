/** API origin. Empty string in production = same-origin (Railway single-service deploy). */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return import.meta.env.DEV ? "http://localhost:8000" : "";
}
