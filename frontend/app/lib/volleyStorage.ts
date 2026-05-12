import type { AnalysisRecord, TrainingSessionRecord } from "@/app/types/volley";

export const ANALYSIS_KEY = "volleypro_analysis_history_v1";
export const TRAINING_KEY = "volleypro_training_history_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadAnalysisHistory(): AnalysisRecord[] {
  if (typeof window === "undefined") return [];
  const rows = safeParse<Partial<AnalysisRecord>[]>(
    localStorage.getItem(ANALYSIS_KEY),
    [],
  );
  return rows
    .filter((r) => r.id && r.savedAt)
    .map((r) => ({
      id: String(r.id),
      savedAt: String(r.savedAt),
      videoId: String(r.videoId ?? ""),
      videoFilename: String(r.videoFilename ?? ""),
      previewFrameKey: String(r.previewFrameKey ?? ""),
      actionType:
        typeof r.actionType === "string" || r.actionType === null
          ? (r.actionType as string | null)
          : null,
      actionLabel:
        typeof r.actionLabel === "string" || r.actionLabel === null
          ? (r.actionLabel as string | null)
          : null,
      score0to10:
        typeof r.score0to10 === "number" && Number.isFinite(r.score0to10)
          ? r.score0to10
          : null,
      coachingParsed:
        r.coachingParsed && typeof r.coachingParsed === "object"
          ? (r.coachingParsed as AnalysisRecord["coachingParsed"])
          : null,
      coachingRaw: typeof r.coachingRaw === "string" ? r.coachingRaw : "",
    }));
}

export function loadTrainingHistory(): TrainingSessionRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse<TrainingSessionRecord[]>(
    localStorage.getItem(TRAINING_KEY),
    [],
  );
}

export function saveAnalysisHistory(items: AnalysisRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(items));
}

export function saveTrainingHistory(items: TrainingSessionRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAINING_KEY, JSON.stringify(items));
}
