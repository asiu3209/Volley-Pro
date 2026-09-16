import { stripJsonFences } from "@/app/lib/coachingJson";
import type { SkillStat, VideoEntry } from "@/app/types/dashboard";

/** Bumped to drop legacy cache rows that used a different id than Supabase. */
const STORAGE_KEY = "vp_recent_analyses_v2";
const LEGACY_STORAGE_KEY = "vp_recent_analyses_v1";
const MAX_ENTRIES = 25;

function safeParse(raw: string | null): VideoEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((row): row is VideoEntry => {
      if (!row || typeof row !== "object") return false;
      const e = row as VideoEntry;
      return typeof e.id === "string" && e.id.length > 0 && typeof e.created_at === "string";
    });
  } catch {
    return [];
  }
}

function clearLegacyCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readRecentAnalysesFromCache(): VideoEntry[] {
  if (typeof window === "undefined") return [];
  clearLegacyCache();
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

/**
 * Collapse the same coaching report when cache used upload video_id and the API
 * historically used a different row UUID (or clocks differ on created_at).
 */
export function analysisContentFingerprint(v: VideoEntry): string {
  const skill = (v.skill_type ?? "").trim().toLowerCase();
  const score =
    v.ai_score !== null && v.ai_score !== undefined
      ? (Math.round(Number(v.ai_score) * 100) / 100).toFixed(2)
      : "null";
  const fb = (v.gemini_feedback ?? "").trim();
  if (fb) {
    let body = fb;
    try {
      const d = JSON.parse(stripJsonFences(fb)) as Record<string, unknown>;
      const summary =
        typeof d.analysis_summary === "string" ? d.analysis_summary : "";
      const finalFb =
        typeof d.final_coaching_feedback === "string"
          ? d.final_coaching_feedback
          : "";
      body = summary || finalFb || fb;
    } catch {
      /* use raw feedback */
    }
    const norm = body.replace(/\s+/g, " ").trim().slice(0, 160).toLowerCase();
    if (norm) return `${skill}|${score}|fb:${norm}`;
  }
  const t = new Date(v.created_at).getTime();
  const bucket = Number.isNaN(t) ? "invalid" : String(Math.floor(t / 180000));
  return `${skill}|${score}|t:${bucket}`;
}

export function appendRecentAnalysisToCache(entry: VideoEntry): void {
  if (typeof window === "undefined") return;
  clearLegacyCache();
  const prev = safeParse(localStorage.getItem(STORAGE_KEY));
  const fp = analysisContentFingerprint(entry);
  const next = [
    entry,
    ...prev.filter(
      (e) => e.id !== entry.id && analysisContentFingerprint(e) !== fp,
    ),
  ].slice(0, MAX_ENTRIES);
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
 * Merge by canonical analysis id, then collapse content duplicates so the same
 * report never appears twice when cache id ≠ API id.
 */
export function mergeRecentVideosFromSources(
  apiVideos: VideoEntry[],
  cached: VideoEntry[],
): VideoEntry[] {
  const apiIds = new Set(
    apiVideos.map((v) => v.id).filter((id): id is string => Boolean(id)),
  );
  const byId = new Map<string, VideoEntry>();

  for (const v of apiVideos) {
    if (!v?.id) continue;
    byId.set(v.id, { ...v });
  }

  for (const v of cached) {
    if (!v?.id) continue;
    const existing = byId.get(v.id);
    if (existing) {
      byId.set(v.id, mergeEntryContent(existing, v));
    } else {
      byId.set(v.id, { ...v });
    }
  }

  const byContent = new Map<string, VideoEntry>();
  for (const v of byId.values()) {
    const fp = analysisContentFingerprint(v);
    const existing = byContent.get(fp);
    if (!existing) {
      byContent.set(fp, v);
      continue;
    }

    const vIsApi = apiIds.has(v.id);
    const exIsApi = apiIds.has(existing.id);
    let keeper: VideoEntry;
    let other: VideoEntry;
    if (vIsApi && !exIsApi) {
      keeper = v;
      other = existing;
    } else if (exIsApi && !vIsApi) {
      keeper = existing;
      other = v;
    } else {
      const vTime = new Date(v.created_at).getTime();
      const exTime = new Date(existing.created_at).getTime();
      if (vTime >= exTime) {
        keeper = v;
        other = existing;
      } else {
        keeper = existing;
        other = v;
      }
    }
    byContent.set(fp, mergeEntryContent(keeper, other));
  }

  return [...byContent.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** Insert/replace one analysis in a list with id + content dedupe. */
export function upsertRecentVideo(
  videos: VideoEntry[],
  entry: VideoEntry,
): VideoEntry[] {
  return mergeRecentVideosFromSources([], [entry, ...videos]);
}

export function replaceRecentAnalysesCache(entries: VideoEntry[]): void {
  if (typeof window === "undefined") return;
  clearLegacyCache();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export function clearRecentAnalysesCache(): void {
  if (typeof window === "undefined") return;
  clearLegacyCache();
  localStorage.removeItem(STORAGE_KEY);
}
