const DEFAULT_STREAM_URL = "http://127.0.0.1:8000/stream/shipments";

function resolveStreamUrl() {
  if (import.meta.env.VITE_STREAM_URL) {
    return import.meta.env.VITE_STREAM_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const host = window.location.hostname;
    const port = import.meta.env.VITE_BACKEND_PORT || "8000";
    return `${protocol}://${host}:${port}/stream/shipments`;
  }
  return DEFAULT_STREAM_URL;
}

export function createShipmentsStream(token) {
  const base = resolveStreamUrl();
  let url;
  try {
    url = new URL(base);
  } catch (_err) {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
    url = new URL(base, origin);
  }
  url.searchParams.set("token", token);
  return new EventSource(url.toString());
}
