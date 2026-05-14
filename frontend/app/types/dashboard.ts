export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UserStats {
  total_videos: number;
  avg_score: number;
}

export interface SkillStat {
  skill: string;
  attempts: number;
  avg_score: number;
}

export interface VideoEntry {
  id: string;
  skill_type: string | null;
  ai_score: number | null;
  created_at: string;
  /** Full Gemini response; kept in localStorage for the Analysis tab */
  gemini_feedback?: string | null;
  action_label?: string | null;
  /** Preview path for coaching layout (optional; may 404 after server deletes media) */
  preview_frame?: string | null;
}

export const EMPTY_STATS: UserStats = { total_videos: 0, avg_score: 0 };

export type AppState =
  | { stage: "idle" }
  | { stage: "uploading" }
  | {
      stage: "selecting";
      previewFrame: string;
      videoFilename: string;
      videoId: string;
    }
  | { stage: "analyzing" }
  | {
      stage: "done";
      previewFrame: string;
      gemini_feedback: string;
      overall_score_0_to_10: number | null;
      action_type: string | null;
      action_label: string | null;
    }
  | { stage: "error"; message: string };

export interface DashboardNavItem {
  id: string;
  label: string;
}
