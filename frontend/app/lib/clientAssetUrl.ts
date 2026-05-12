/**
 * Same-origin URL for a frame served via `/api/asset` (proxies Python `/frames`).
 * Never call the Python host from the browser.
 */
export function clientAssetUrl(frameKey: string): string {
  if (!frameKey) return "";
  if (frameKey.startsWith("/api/")) return frameKey;
  const key = frameKey.split(/[/\\]/).pop() ?? frameKey;
  return `/api/asset?key=${encodeURIComponent(key)}`;
}

export function previewKeyFromUploadPath(previewPath: string): string {
  return previewPath.split(/[/\\]/).pop() ?? previewPath;
}
