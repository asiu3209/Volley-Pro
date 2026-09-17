const PUBLIC_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/** Resolve a frames path or absolute URL / data URL for <img src>. */
export function backendAssetUrl(path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (
    p.startsWith("data:") ||
    p.startsWith("blob:") ||
    p.startsWith("http://") ||
    p.startsWith("https://")
  ) {
    return p;
  }
  return `${PUBLIC_API_URL}/${p.replace(/^\/+/, "")}`;
}

export function backendApiUrl(path: string): string {
  return `${PUBLIC_API_URL}/${path.replace(/^\/+/, "")}`;
}
