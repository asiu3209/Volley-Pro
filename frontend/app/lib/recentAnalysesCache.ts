import type { SkillStat, VideoEntry } from "@/app/types/dashboard";

const STORAGE_KEY = "vp_recent_analyses_v1";
const MAX_ENTRIES = 25;

function safeParse(raw: string | null): VideoEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((row): row is VideoEntry => {
      if (!row || typeof row !== "object") return false;
      const e = row as VideoEntry;
      return typeof e.id === "string" && typeof e.created_at === "string";
    });
  } catch {
    return [];
  }
}

export function readRecentAnalysesFromCache(): VideoEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function appendRecentAnalysisToCache(entry: VideoEntry): void {
  if (typeof window === "undefined") return;
  const prev = safeParse(localStorage.getItem(STORAGE_KEY));
  const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function deriveSkillStatsFromVideos(videos: VideoEntry[]): SkillStat[] {
  const grouped: Record<string, number[]> = {};
  for (const v of videos) {
    if (v.ai_score === null || v.ai_score === undefined) continue;
    const skill = v.skill_type?.trim() || "unknown";
    grouped[skill] ??= [];
    grouped[skill].push(Number(v.ai_score));
  }
  const stats: SkillStat[] = [];
  for (const [skill, scores] of Object.entries(grouped)) {
    if (scores.length === 0) continue;
    stats.push({
      skill,
      attempts: scores.length,
      avg_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    });
  }
  return stats.sort((a, b) => b.attempts - a.attempts);
}

export function mergeRecentVideosFromSources(
  apiVideos: VideoEntry[],
  cached: VideoEntry[],
): VideoEntry[] {
  const seen = new Set<string>();
  const merged: VideoEntry[] = [];
  for (const v of [...cached, ...apiVideos]) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    merged.push(v);
  }
  return merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function clearRecentAnalysesCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
