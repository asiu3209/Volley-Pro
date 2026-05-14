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

/**
 * Same analysis often appears twice: localStorage uses the upload `video_id` as `id`,
 * while Supabase assigns a new row UUID. Dedupe by skill + score + a short time bucket,
 * then keep the API row's `id` and merge coaching fields from the device cache.
 */
function analysisFingerprint(v: VideoEntry): string {
  const skill = (v.skill_type ?? "").trim().toLowerCase();
  const t = new Date(v.created_at).getTime();
  if (Number.isNaN(t)) return `${skill}|invalid|${v.id}`;
  const bucket = Math.floor(t / 60000);
  const score =
    v.ai_score !== null && v.ai_score !== undefined
      ? (Math.round(Number(v.ai_score) * 100) / 100).toFixed(2)
      : "null";
  return `${skill}|${score}|${bucket}`;
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

export function mergeRecentVideosFromSources(
  apiVideos: VideoEntry[],
  cached: VideoEntry[],
): VideoEntry[] {
  const byFp = new Map<string, VideoEntry>();

  for (const v of apiVideos) {
    byFp.set(analysisFingerprint(v), { ...v });
  }

  for (const v of cached) {
    const fp = analysisFingerprint(v);
    const existing = byFp.get(fp);
    if (existing) {
      byFp.set(fp, mergeEntryContent(existing, v));
    } else {
      byFp.set(fp, { ...v });
    }
  }

  const seenId = new Set<string>();
  const merged: VideoEntry[] = [];
  for (const v of byFp.values()) {
    if (seenId.has(v.id)) continue;
    seenId.add(v.id);
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
