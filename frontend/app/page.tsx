"use client";

import { useState } from "react";

import AnalysisHistoryTab from "@/app/components/AnalysisHistoryTab";
import DashboardHeader from "@/app/components/DashboardHeader";
import DashboardSidebar, {
  getNavigationLabel,
} from "@/app/components/DashboardSidebar";
import DashboardTabContent from "@/app/components/DashboardTabContent";
import PlayerSelector from "@/app/components/Playerselector";
import TrainingHistoryTab from "@/app/components/TrainingHistoryTab";
import type { AppState, Rect } from "@/app/components/dashboard/types";
import {
  DashboardDataProvider,
  useDashboardData,
} from "@/app/context/DashboardDataContext";
import { errorMessage } from "@/app/lib/errorMessage";
import { isVolleyVideoTestMode } from "@/app/lib/volleyVideoTestMode";
import type { ClientAnalyzeResponse } from "@/app/types/volley";

function VolleyProDashboard() {
  const { addAnalysisRecord, addTrainingSession } = useDashboardData();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });

  async function handleUpload(file: File) {
    setUploadOpen(false);
    setAppState({ stage: "uploading" });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/videos/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        error?: unknown;
        upload?: {
          videoId: string;
          videoFilename: string;
          previewFrameKey: string;
        };
      };
      if (!res.ok) {
        setAppState({
          stage: "error",
          message: errorMessage(data.error, "Upload failed."),
        });
        return;
      }
      const u = data.upload;
      if (!u?.previewFrameKey || !u.videoFilename || !u.videoId) {
        setAppState({
          stage: "error",
          message: "Invalid upload response.",
        });
        return;
      }

      setAppState({
        stage: "selecting",
        previewFrameKey: u.previewFrameKey,
        videoFilename: u.videoFilename,
        videoId: u.videoId,
      });
    } catch {
      setAppState({ stage: "error", message: "Network error during upload." });
    }
  }

  async function handleAnalyzeConfirmed(bbox: Rect, actionType: string) {
    if (appState.stage !== "selecting") return;
    const { videoFilename, videoId, previewFrameKey } = appState;
    setAppState({ stage: "analyzing" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          video_filename: videoFilename,
          preview_frame: previewFrameKey,
          bbox_x: bbox.x,
          bbox_y: bbox.y,
          bbox_w: bbox.w,
          bbox_h: bbox.h,
          action_type: actionType,
        }),
      });
      const data = (await res.json()) as ClientAnalyzeResponse & {
        error?: unknown;
      };
      if (!res.ok) {
        setAppState({
          stage: "error",
          message: errorMessage(data.error, "Analysis failed."),
        });
        return;
      }

      const a = data.analysis;
      if (!a) {
        setAppState({
          stage: "error",
          message: "Invalid analysis response.",
        });
        return;
      }

      const scoreUi = a.score0to10;

      setAppState({
        stage: "done",
        previewFrameKey,
        coachingParsed: a.coachingParsed,
        coachingRaw: a.coachingRaw,
        overall_score_0_to_10: scoreUi,
        action_type: a.actionType,
        action_label: a.actionLabel,
      });

      if (!isVolleyVideoTestMode()) {
        const analysisId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `a-${Date.now()}`;
        const trainingId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `t-${Date.now()}`;
        const savedAt = new Date().toISOString();

        addAnalysisRecord({
          id: analysisId,
          savedAt,
          videoId,
          videoFilename,
          previewFrameKey,
          actionType: a.actionType,
          actionLabel: a.actionLabel,
          score0to10: scoreUi,
          coachingParsed: a.coachingParsed,
          coachingRaw: a.coachingRaw,
        });

        addTrainingSession({
          id: trainingId,
          savedAt,
          videoId,
          actionLabel: a.actionLabel,
          recommendations: data.training?.recommendations ?? [],
        });
      }
    } catch {
      setAppState({
        stage: "error",
        message: "Network error during analysis.",
      });
    }
  }

  function reset() {
    setAppState({ stage: "idle" });
  }

  function openUploadFlow() {
    reset();
    setUploadOpen(true);
  }

  const headerTitle = getNavigationLabel(activeTab) ?? "Dashboard";

  return (
    <div className="flex h-screen bg-gray-900">
      {appState.stage === "selecting" && (
        <PlayerSelector
          previewFrameKey={appState.previewFrameKey}
          onConfirm={handleAnalyzeConfirmed}
          onCancel={reset}
        />
      )}

      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex-1 overflow-auto">
        <DashboardHeader
          title={headerTitle}
          uploadOpen={uploadOpen}
          onCloseUpload={() => setUploadOpen(false)}
          onOpenUpload={openUploadFlow}
          onUpload={handleUpload}
        />

        {activeTab === "dashboard" && (
          <DashboardTabContent appState={appState} onReset={reset} />
        )}

        {activeTab === "stats" && (
          <div className="p-6 text-gray-400">
            Statistics will show here when backed by real data.
          </div>
        )}

        {activeTab === "training" && <TrainingHistoryTab />}

        {activeTab === "analysis" && <AnalysisHistoryTab />}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <DashboardDataProvider>
      <VolleyProDashboard />
    </DashboardDataProvider>
  );
}
