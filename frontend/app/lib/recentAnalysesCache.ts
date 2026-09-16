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

function mergeEntryContent(existing: VideoEntry, incoming: VideoEntry): VideoEntry {
  const exL = existing.gemini_feedback?.trim().length ?? 0;
  const inL = incoming.gemini_feedback?.trim().length ?? 0;
  return {
    ...existing,
    gemini_feedback:
      inL > exL ? incoming.gemini_feedback : existing.gemini_feedback,
    action_label:
      existing.action_label?.trim() ||
      incoming.action_label?.trim() ||
      null,
    preview_frame:
      existing.preview_frame?.trim() ||
      incoming.preview_frame?.trim() ||
      null,
  };
}

/**
 * Merge by canonical analysis id (upload video_id === video_analyses.id).
 * API rows win for score/skill/timestamps; cache can fill coaching text / preview.
 */
export function mergeRecentVideosFromSources(
  apiVideos: VideoEntry[],
  cached: VideoEntry[],
): VideoEntry[] {
  const byId = new Map<string, VideoEntry>();

  for (const v of apiVideos) {
    byId.set(v.id, { ...v });
  }

  for (const v of cached) {
    const existing = byId.get(v.id);
    if (existing) {
      byId.set(v.id, mergeEntryContent(existing, v));
    } else {
      byId.set(v.id, { ...v });
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function replaceRecentAnalysesCache(entries: VideoEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export function clearRecentAnalysesCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
