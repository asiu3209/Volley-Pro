import { stripJsonFences } from "@/app/lib/coachingJson";
import type { CoachingPayload } from "@/app/types/coaching";
import type { YouTubeRecommendation } from "@/app/types/volley";

export function parseCoachingPayload(raw: string): CoachingPayload | null {
  try {
    return JSON.parse(stripJsonFences(raw)) as CoachingPayload;
  } catch {
    return null;
  }
}

export function extractYoutubeRecommendations(
  data: CoachingPayload | null,
): YouTubeRecommendation[] {
  if (!data) return [];
  const raw = data.youtube_recommendations;
  if (!Array.isArray(raw)) return [];
  const out: YouTubeRecommendation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const url = typeof rec.youtube_url === "string" ? rec.youtube_url.trim() : "";
    if (!url.startsWith("http")) continue;
    out.push({
      title: typeof rec.title === "string" ? rec.title : "Video",
      channel: typeof rec.channel === "string" ? rec.channel : undefined,
      url,
      reason: typeof rec.reason === "string" ? rec.reason : undefined,
    });
  }
  return out;
}
