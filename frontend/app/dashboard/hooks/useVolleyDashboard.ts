"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { errorMessage } from "@/app/lib/apiErrorMessage";
import { backendApiUrl } from "@/app/lib/backendUrl";
import { stripJsonFences } from "@/app/lib/coachingJson";
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
} from "@/app/lib/recentAnalysesCache";
import { clearAuth, getToken, getUser } from "@/app/lib/auth";
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
      const usingDefaultLocalApi =
        !publicApi || publicApi === "http://localhost:8000";
      if (
        usingDefaultLocalApi &&
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        setAppState({
          stage: "error",
          message:
            "Upload API URL is not configured. Set NEXT_PUBLIC_API_URL on Vercel to your FastAPI base URL (e.g. your Railway URL).",
        });
        return;
      }

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

        setAppState({
          stage: "selecting",
          previewFrame: data.preview_frame ?? "",
          videoFilename: data.video_filename ?? "",
          videoId: data.video_id ?? "",
        });
      } catch {
        setAppState({ stage: "error", message: "Network error during upload." });
      }
    },
    [router],
  );

  const handleAnalyzeConfirmed = useCallback(
    async (bbox: Rect, actionType: string) => {
      if (appState.stage !== "selecting") return;
      const { videoFilename, videoId, previewFrame } = appState;
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
          overall_score_0_to_10?: number;
          action_type?: string | null;
          action_label?: string | null;
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
        let scoreUi: number | null = null;
        if (
          typeof data.overall_score_0_to_10 === "number" &&
          Number.isFinite(data.overall_score_0_to_10)
        ) {
          scoreUi = data.overall_score_0_to_10;
        } else {
          try {
            const parsed = JSON.parse(stripJsonFences(rawFeedback)) as {
              overall_score?: unknown;
            };
            if (typeof parsed.overall_score === "number") {
              scoreUi = Math.max(0, Math.min(10, parsed.overall_score / 10));
            }
          } catch {
            /* fallback: show raw text only */
          }
        }

        setAppState({
          stage: "done",
          previewFrame,
          gemini_feedback: rawFeedback,
          overall_score_0_to_10: scoreUi,
          action_type: data.action_type ?? actionType ?? null,
          action_label: data.action_label ?? null,
        });

        const tips = parseImprovementTipsFromGemini(rawFeedback);
        setDashboardTips(tips);
        persistDashboardTips(tips);

        appendRecentAnalysisToCache({
          id: videoId,
          skill_type: data.action_type ?? actionType ?? null,
          action_label: data.action_label ?? null,
          gemini_feedback: rawFeedback,
          preview_frame: previewFrame,
          ai_score: scoreUi,
          created_at: new Date().toISOString(),
        });

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
