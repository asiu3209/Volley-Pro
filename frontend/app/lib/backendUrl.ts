const PUBLIC_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export function backendAssetUrl(path: string): string {
  return `${PUBLIC_API_URL}/${path.replace(/^\/+/, "")}`;
}

export function backendApiUrl(path: string): string {
  return backendAssetUrl(path);
}
