"use client";

import { useState } from "react";
import UploadVideo from "./components/UploadVideo/UploadVideo";
import PlayerSelector from "./components/Playerselector";
import { backendApiUrl, backendAssetUrl } from "./lib/backendUrl";

type AppState =
  | { stage: "idle" }
  | { stage: "uploading" }
  | {
      stage: "selecting";
      previewFrame: string;
      videoFilename: string;
      videoId: string;
    }
  | { stage: "analyzing" }
  | { stage: "done"; frames: FrameMeta[] }
  | { stage: "error"; message: string };

interface FrameMeta {
  frame_index: number;
  timestamp: number;
  path: string;
  motion_score: number;
  tracked_bbox: [number, number, number, number] | null;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function frameProxyUrl(path: string): string {
  return backendAssetUrl(`frames/${path}`);
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }
  if (error && typeof error === "object" && "msg" in error) {
    return String(error.msg);
  }
  return fallback;
}

export default function VolleyProDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });

  const navigationItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "stats", label: "Statistics" },
    { id: "training", label: "Training" },
    { id: "analysis", label: "Analysis" },
  ];

  const recentVideos = [
    {
      id: 1,
      title: "Spike Technique - Practice",
      skill: "Spike",
      date: "2024-01-15",
      status: "completed",
      score: 8.5,
    },
    {
      id: 2,
      title: "Serve Analysis",
      skill: "Serve",
      date: "2024-01-14",
      status: "analyzing",
      score: null,
    },
    {
      id: 3,
      title: "Block Training",
      skill: "Block",
      date: "2024-01-13",
      status: "completed",
      score: 7.8,
    },
  ];

  const statsData = [
    { skill: "Serve", attempts: 150, success: 127, rate: 84.7 },
    { skill: "Spike", attempts: 200, success: 156, rate: 78.0 },
    { skill: "Block", attempts: 180, success: 142, rate: 78.9 },
    { skill: "Dig", attempts: 220, success: 189, rate: 85.9 },
  ];

  const tips = [
    {
      id: 1,
      title: "Perfect Your Serve Toss",
      skill: "Serve",
      priority: "high",
    },
    {
      id: 2,
      title: "Improve Approach Timing",
      skill: "Spike",
      priority: "medium",
    },
    {
      id: 3,
      title: "Strengthen Core for Blocks",
      skill: "Block",
      priority: "low",
    },
  ];

  // ── Step 1: upload ──────────────────────────────────────────────────────────
  async function handleUpload(file: File) {
    setUploadOpen(false);
    setAppState({ stage: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(backendApiUrl("videos/upload"), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("Preview Photo Data: " + data);
      if (!res.ok) {
        setAppState({
          stage: "error",
          message: errorMessage(data.error, "Upload failed."),
        });
        return;
      }

      setAppState({
        stage: "selecting",
        previewFrame: data.preview_frame,
        videoFilename: data.video_filename,
        videoId: data.video_id,
      });
    } catch {
      setAppState({ stage: "error", message: "Network error during upload." });
    }
  }

  // ── Step 2: player bbox confirmed → analyse ─────────────────────────────────
  async function handlePlayerSelected(bbox: Rect) {
    if (appState.stage !== "selecting") return;
    const { videoFilename, videoId } = appState;
    setAppState({ stage: "analyzing" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bbox_x: bbox.x,
          bbox_y: bbox.y,
          bbox_w: bbox.w,
          bbox_h: bbox.h,
          video_id: videoId,
          video_filename: videoFilename,
          max_frames: 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppState({
          stage: "error",
          message: errorMessage(data.error, "Analysis failed."),
        });
        return;
      }

      setAppState({
        stage: "done",
        frames: data.frames,
      });
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

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Player selector modal */}
      {appState.stage === "selecting" && (
        <PlayerSelector
          previewFramePath={appState.previewFrame}
          onConfirm={handlePlayerSelected}
          onCancel={reset}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-gray-900 to-gray-600 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-orange-600 text-2xl font-bold">VolleyPro</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg"
          />
        </div>
        <nav className="flex-1 px-3">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === item.id
                  ? "bg-gray-700 text-orange-600 shadow-lg"
                  : "hover:bg-white/10"
              }`}
            >
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button className="w-full px-4 py-3 rounded-lg hover:bg-white/10 text-left">
            {sidebarOpen && <span>Settings</span>}
          </button>
          <button className="w-full px-4 py-3 rounded-lg hover:bg-white/10 text-left">
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-gray-900 shadow-sm p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-100">
                {navigationItems.find((i) => i.id === activeTab)?.label}
              </h2>
              <p className="text-gray-300 mt-1">
                Track, analyze, and improve your volleyball skills
              </p>
            </div>
            <button
              onClick={() => {
                reset();
                setUploadOpen(true);
              }}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
            >
              Submit Video
            </button>
            <UploadVideo
              isOpen={uploadOpen}
              onClose={() => setUploadOpen(false)}
              onUpload={handleUpload}
            />
          </div>
        </header>

        {activeTab === "dashboard" && (
          <div className="p-6 bg-gray-900">
            {/* Status banners */}
            {(appState.stage === "uploading" ||
              appState.stage === "analyzing") && (
              <div className="mb-6 rounded-xl bg-indigo-900/40 border border-indigo-500 p-4 text-indigo-200 flex items-center gap-3">
                <svg
                  className="animate-spin h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {appState.stage === "uploading" ? "Uploading video…" : ""}
                {appState.stage === "analyzing"
                  ? "Tracking player and finding key frames…"
                  : ""}
              </div>
            )}

            {appState.stage === "error" && (
              <div className="mb-6 rounded-xl bg-red-900/40 border border-red-500 p-4 text-red-200 flex justify-between">
                <span>{appState.message}</span>
                <button
                  onClick={reset}
                  className="text-sm underline ml-4 shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Extracted frames */}
            {appState.stage === "done" && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-100">
                    Action Frames
                    <span className="ml-3 text-sm font-normal text-gray-400">
                      ({appState.frames.length} keyframes)
                    </span>
                  </h3>
                  <button
                    onClick={reset}
                    className="text-sm text-orange-500 hover:text-orange-400"
                  >
                    ← New video
                  </button>
                </div>

                {appState.frames.length === 0 ? (
                  <p className="text-gray-400">
                    No high-motion frames detected. Try drawing a tighter box
                    around the player, or use a clip where the player is active.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {appState.frames.map((frame, i) => (
                      <div
                        key={i}
                        className="bg-gray-800 rounded-xl overflow-hidden"
                      >
                        <img
                          src={frameProxyUrl(frame.path)}
                          alt={`Action at ${frame.timestamp}s`}
                          className="w-full object-cover"
                        />
                        <div className="p-2">
                          <p className="text-xs text-gray-300">
                            t = {frame.timestamp}s
                          </p>
                          <div className="mt-1 h-1.5 rounded-full bg-gray-700">
                            <div
                              className="h-1.5 rounded-full bg-orange-500 transition-all"
                              style={{
                                width: `${Math.round(frame.motion_score * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Impact {Math.round(frame.motion_score * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-teal-500 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">24</div>
                <div className="text-white/80">Videos Analyzed</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">81.5%</div>
                <div className="text-white/80">Overall Success Rate</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">12</div>
                <div className="text-white/80">Training Sessions</div>
              </div>
              <div className="bg-sky-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">8.2</div>
                <div className="text-white/80">Average Score</div>
              </div>
            </div>

            {/* Recent videos + tips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-100">
                    Recent Videos
                  </h3>
                  <button className="text-orange-600 font-semibold text-sm">
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {recentVideos.map((v) => (
                    <div
                      key={v.id}
                      className="border-l-4 border-orange-500 flex items-center justify-between p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-100">
                            {v.title}
                          </h4>
                          <div className="flex items-center space-x-3 mt-1 text-sm text-gray-100">
                            <span>{v.skill}</span>
                            <span className="text-gray-400">•</span>
                            <span>{v.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {v.status === "completed" ? (
                          <>
                            <div className="text-2xl font-bold text-green-400">
                              {v.score}
                            </div>
                            <div className="text-xs text-gray-300">Score</div>
                          </>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                            Analyzing…
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-100 mb-6">
                  Improvement Tips
                </h3>
                <div className="space-y-4">
                  {tips.map((tip) => (
                    <div
                      key={tip.id}
                      className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl border-l-4 border-orange-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-100 text-sm">
                          {tip.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ml-2 ${
                            tip.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : tip.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {tip.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200">{tip.skill}</p>
                      <button className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-semibold">
                        Learn More →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-100 mb-6">
                Performance Overview
              </h3>
              <div className="space-y-4">
                {statsData.map((s) => (
                  <div key={s.skill} className="p-4 bg-gray-700 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-100">{s.skill}</h4>
                      <span className="text-2xl font-bold text-orange-600">
                        {s.rate}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 mb-2">
                      {s.success} / {s.attempts} successful
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full"
                        style={{ width: `${s.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
