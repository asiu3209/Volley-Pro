import type { CoachingPayload } from "@/app/types/coaching";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AppState =
  | { stage: "idle" }
  | { stage: "uploading" }
  | {
      stage: "selecting";
      previewFrameKey: string;
      videoFilename: string;
      videoId: string;
    }
  | { stage: "analyzing" }
  | {
      stage: "done";
      previewFrameKey: string;
      coachingParsed: CoachingPayload | null;
      coachingRaw: string;
      overall_score_0_to_10: number | null;
      action_type: string | null;
      action_label: string | null;
    }
  | { stage: "error"; message: string };
