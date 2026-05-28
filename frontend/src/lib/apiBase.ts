/** Production API (Railway listens on port 8000 internally; public URL uses HTTPS). */
const PRODUCTION_API_URL = "https://co-helper-inquiry-system-production.up.railway.app";

/** API origin for fetch calls. */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return import.meta.env.DEV ? "http://localhost:8000" : PRODUCTION_API_URL;
}
