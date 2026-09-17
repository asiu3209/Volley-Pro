"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { errorMessage } from "@/app/lib/apiErrorMessage";
import { prefetchActionTypes } from "@/app/lib/actionTypesCache";
import { backendApiUrl } from "@/app/lib/backendUrl";
import { stripJsonFences } from "@/app/lib/coachingJson";
import { extractVideoFirstFrame } from "@/app/lib/extractVideoFirstFrame";
import {
  clearPersistedDashboardTips,
  parseImprovementTipsFromGemini,
  persistDashboardTips,
  readPersistedDashboardTips,
  type DashboardTip,
} from "@/app/lib/dashboardTips";
import {
  appendRecentAnalysisToCache,
  clearRecentAnalysesCache,
  deriveSkillStatsFromVideos,
  mergeRecentVideosFromSources,
  readRecentAnalysesFromCache,
  replaceRecentAnalysesCache,
  upsertRecentVideo,
} from "@/app/lib/recentAnalysesCache";
import { clearAuth, getToken, getUser } from "@/app/lib/auth";
import { clampScore100 } from "@/app/lib/scoreDisplay";
import { createClient } from "@/app/lib/supabase/client";
import type { AuthUser } from "@/app/lib/auth";
import type { Rect } from "@/app/types/dashboard";
import {
  EMPTY_STATS,
  type AppState,
  type SkillStat,
  type UserStats,
  type VideoEntry,
} from "@/app/types/dashboard";

export function useVolleyDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(EMPTY_STATS);
  const [recentVideos, setRecentVideos] = useState<VideoEntry[]>([]);
  const [skillStats, setSkillStats] = useState<SkillStat[]>([]);
  const [dashboardTips, setDashboardTips] = useState<DashboardTip[]>([]);

  const fetchUserData = useCallback(async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const cachedVideos = readRecentAnalysesFromCache();
    try {
      const [statsRes, videosRes] = await Promise.all([
        fetch("/api/users/stats", { headers }),
        fetch("/api/users/videos", { headers }),
      ]);
      if (statsRes.ok) {
        setUserStats((await statsRes.json()) as UserStats);
      }
      if (videosRes.ok) {
        const v = (await videosRes.json()) as { videos: VideoEntry[] };
        const merged = mergeRecentVideosFromSources(v.videos ?? [], cachedVideos);
        setRecentVideos(merged);
        setSkillStats(deriveSkillStatsFromVideos(merged));
        replaceRecentAnalysesCache(merged);
      } else {
        setRecentVideos(cachedVideos);
        setSkillStats(deriveSkillStatsFromVideos(cachedVideos));
      }
    } catch {
      setRecentVideos(cachedVideos);
      setSkillStats(deriveSkillStatsFromVideos(cachedVideos));
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }
    setUser(storedUser);
    void fetchUserData(token);
    void prefetchActionTypes().catch(() => undefined);
    const cachedTips = readPersistedDashboardTips();
    if (cachedTips.length > 0) {
      setDashboardTips(cachedTips);
    }
  }, [router, fetchUserData]);

  const handleLogout = useCallback(() => {
    clearPersistedDashboardTips();
    clearRecentAnalysesCache();
    setDashboardTips([]);
    clearAuth();
    void createClient()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }, [router]);

  const reset = useCallback(() => {
    setAppState({ stage: "idle" });
  }, []);

  const openUploadFlow = useCallback(() => {
    reset();
    setUploadOpen(true);
  }, [reset]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadOpen(false);
      setAppState({ stage: "uploading" });
      setDashboardTips([]);
      clearPersistedDashboardTips();
      const token = getToken();
      const authUser = getUser();
      if (!token || !authUser) {
        router.replace("/login");
        return;
      }

      const publicApi = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
      if (!publicApi) {
        setAppState({
          stage: "error",
          message:
            "Upload API URL is not configured. Set NEXT_PUBLIC_API_URL to your FastAPI base URL.",
        });
        return;
      }

      let localPreviewUrl: string;
      try {
        localPreviewUrl = await extractVideoFirstFrame(file);
      } catch {
        setAppState({
          stage: "error",
          message:
            "Could not read a preview frame from this video. Try re-encoding to H.264 MP4.",
        });
        return;
      }

      // Open player selection immediately with a local frame; upload in parallel.
      setAppState({
        stage: "selecting",
        localPreviewUrl,
        previewFrame: "",
        videoFilename: "",
        videoId: "",
        uploadReady: false,
      });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(backendApiUrl("videos/upload"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-User-Id": authUser.id,
          },
          body: formData,
        });
        const data = (await res.json()) as {
          detail?: unknown;
          error?: unknown;
          preview_frame?: string;
          video_filename?: string;
          video_id?: string;
        };
        if (!res.ok) {
          setAppState({
            stage: "error",
            message: errorMessage(data.error ?? data.detail, "Upload failed."),
          });
          return;
        }

        setAppState((prev) => {
          if (prev.stage !== "selecting") return prev;
          return {
            ...prev,
            previewFrame: data.preview_frame ?? "",
            videoFilename: data.video_filename ?? "",
            videoId: data.video_id ?? "",
            uploadReady: true,
          };
        });
      } catch {
        setAppState({ stage: "error", message: "Network error during upload." });
      }
    },
    [router],
  );

  const handleAnalyzeConfirmed = useCallback(
    async (bbox: Rect, actionType: string) => {
      if (appState.stage !== "selecting" || !appState.uploadReady) return;
      const { videoFilename, videoId, previewFrame, localPreviewUrl } = appState;
      setAppState({ stage: "analyzing" });
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            video_id: videoId,
            video_filename: videoFilename,
            preview_frame: previewFrame,
            bbox_x: bbox.x,
            bbox_y: bbox.y,
            bbox_w: bbox.w,
            bbox_h: bbox.h,
            action_type: actionType,
          }),
        });
        const data = (await res.json()) as {
          detail?: unknown;
          error?: unknown;
          gemini_feedback?: string;
          overall_score_0_to_100?: number;
          action_type?: string | null;
          action_label?: string | null;
          analysis_id?: string;
          video_id?: string;
          vision_model?: import("@/app/types/dashboard").VisionModelResult | null;
        };
        if (!res.ok) {
          setAppState({
            stage: "error",
            message: errorMessage(data.error ?? data.detail, "Analysis failed."),
          });
          return;
        }

        const rawFeedback =
          typeof data.gemini_feedback === "string" ? data.gemini_feedback : "";
        let scoreUi = clampScore100(data.overall_score_0_to_100);
        if (scoreUi === null) {
          try {
            const parsed = JSON.parse(stripJsonFences(rawFeedback)) as {
              overall_score?: unknown;
            };
            if (typeof parsed.overall_score === "number") {
              scoreUi = clampScore100(parsed.overall_score);
            }
          } catch {
            /* show raw text only */
          }
        }

        const analysisId =
          (typeof data.analysis_id === "string" && data.analysis_id.trim()) ||
          (typeof data.video_id === "string" && data.video_id.trim()) ||
          videoId;

        setAppState({
          stage: "done",
          previewFrame: localPreviewUrl || previewFrame,
          gemini_feedback: rawFeedback,
          overall_score_0_to_100: scoreUi,
          action_type: data.action_type ?? actionType ?? null,
          action_label: data.action_label ?? null,
          vision_model: data.vision_model ?? null,
        });

        const tips = parseImprovementTipsFromGemini(rawFeedback);
        setDashboardTips(tips);
        persistDashboardTips(tips);

        const entry = {
          id: analysisId,
          skill_type: data.action_type ?? actionType ?? null,
          action_label: data.action_label ?? null,
          gemini_feedback: rawFeedback,
          preview_frame: localPreviewUrl || previewFrame,
          ai_score: scoreUi,
          vision_model: data.vision_model ?? null,
          created_at: new Date().toISOString(),
        };
        appendRecentAnalysisToCache(entry);
        setRecentVideos((prev) => upsertRecentVideo(prev, entry));

        void fetchUserData(token);
      } catch {
        setAppState({
          stage: "error",
          message: "Network error during analysis.",
        });
      }
    },
    [appState, router, fetchUserData],
  );

  return {
    user,
    activeTab,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    uploadOpen,
    setUploadOpen,
    appState,
    userStats,
    skillStats,
    recentVideos,
    dashboardTips,
    handleLogout,
    reset,
    openUploadFlow,
    handleUpload,
    handleAnalyzeConfirmed,
  };
}
