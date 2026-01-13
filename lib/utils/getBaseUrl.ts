export function getBaseUrl() {
  // Browser (client-side)
  if (typeof window !== "undefined") {
    return "";
  }

  // Server-side (Node / Next API / TGEM engine)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // Dev fallback
  return "http://localhost:3000";
}
