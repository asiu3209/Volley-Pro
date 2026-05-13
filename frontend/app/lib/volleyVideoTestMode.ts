/** Video-only demo branch: skip persisting analysis/training to local storage. */
export function isVolleyVideoTestMode(): boolean {
  const v = process.env.NEXT_PUBLIC_VOLLEY_VIDEO_TEST?.toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes";
}
