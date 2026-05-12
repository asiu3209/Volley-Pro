import type { CoachingPayload } from "@/app/types/coaching";

export type YouTubeRecommendation = {
  title: string;
  channel?: string;
  url: string;
  reason?: string;
};

export type AnalysisRecord = {
  id: string;
  savedAt: string;
  videoId: string;
  videoFilename: string;
  previewFrameKey: string;
  actionType: string | null;
  actionLabel: string | null;
  score0to10: number | null;
  coachingParsed: CoachingPayload | null;
  coachingRaw: string;
};

export type TrainingSessionRecord = {
  id: string;
  savedAt: string;
  videoId: string;
  actionLabel: string | null;
  recommendations: YouTubeRecommendation[];
};

export type ClientAnalyzeResponse = {
  analysis: {
    actionType: string | null;
    actionLabel: string | null;
    score0to10: number | null;
    coachingParsed: CoachingPayload | null;
    coachingRaw: string;
  };
  training: {
    recommendations: YouTubeRecommendation[];
  };
};
