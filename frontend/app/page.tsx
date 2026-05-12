"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UploadVideo from "./components/UploadVideo/UploadVideo";
import PlayerSelector from "./components/Playerselector";
import { backendAssetUrl } from "./lib/backendUrl";
import { getToken, getUser, clearAuth } from "./lib/auth";
import type { AuthUser } from "./lib/auth";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UserStats {
  total_videos: number;
  avg_score: number;
}

interface SkillStat {
  skill: string;
  attempts: number;
  avg_score: number;
}

interface VideoEntry {
  id: string;
  skill_type: string | null;
  ai_score: number | null;
  created_at: string;
}

const EMPTY_STATS: UserStats = { total_videos: 0, avg_score: 0 };

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
  | {
      stage: "done";
      previewFrame: string;
      gemini_feedback: string;
      overall_score_0_to_10: number | null;
      action_type: string | null;
      action_label: string | null;
    }
  | { stage: "error"; message: string };

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  return t.trim();
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

type CoachingPayload = Record<string, unknown>;

function nonEmptyStrings(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

function DoneCoachingSummary({ raw }: { raw: string }) {
  let data: CoachingPayload | null = null;
  try {
    data = JSON.parse(stripJsonFences(raw)) as CoachingPayload;
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-950 p-4">
        <p className="mb-2 text-sm text-gray-400">
          Raw model response (could not parse as JSON):
        </p>
        <pre className="max-h-[min(560px,60vh)] overflow-auto whitespace-pre-wrap break-words text-xs text-gray-200">
          {raw}
        </pre>
      </div>
    );
  }

  const identity =
    typeof data.identity_note === "string" ? data.identity_note.trim() : "";
  const summary =
    typeof data.analysis_summary === "string"
      ? data.analysis_summary.trim()
      : "";
  const finalFb =
    typeof data.final_coaching_feedback === "string"
      ? data.final_coaching_feedback.trim()
      : "";
  const strengths = nonEmptyStrings(data.strengths);
  const weaknesses = nonEmptyStrings(data.weaknesses);
  const highlightsRaw = Array.isArray(data.timeline_highlights)
    ? data.timeline_highlights
    : [];
  const highlights = highlightsRaw.filter(
    (h): h is Record<string, unknown> =>
      h !== null && typeof h === "object" && !Array.isArray(h),
  );

  return (
    <div className="space-y-5">
      {identity ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Athlete identification
          </h4>
          <p className="text-sm text-gray-200">{identity}</p>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Summary
          </h4>
          <p className="text-sm leading-relaxed text-gray-100">{summary}</p>
        </section>
      ) : null}

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {strengths.length > 0 && (
            <section className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4">
              <h4 className="mb-2 text-xs uppercase tracking-wide text-emerald-400">
                Strengths
              </h4>
              <ul className="list-disc space-y-1 pl-4 text-sm text-gray-100">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}
          {weaknesses.length > 0 && (
            <section className="rounded-xl border border-amber-900/50 bg-amber-950/25 p-4">
              <h4 className="mb-2 text-xs uppercase tracking-wide text-amber-400">
                Weaknesses
              </h4>
              <ul className="list-disc space-y-1 pl-4 text-sm text-gray-100">
                {weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {highlights.length > 0 ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h4 className="mb-2 text-xs uppercase tracking-wide text-gray-500">
            Timeline highlights
          </h4>
          <ul className="space-y-3 text-sm text-gray-200">
            {highlights.map((h, i) => {
              const sec = typeof h.approximate_seconds === "number"
                ? h.approximate_seconds
                : null;
              const note =
                typeof h.technical_note === "string" ? h.technical_note : "";
              return (
                <li key={i} className="border-l-2 border-indigo-500 pl-3">
                  {sec !== null ? (
                    <span className="mr-2 font-mono text-indigo-300">
                      ~{sec.toFixed(1)}s
                    </span>
                  ) : null}
                  {note || JSON.stringify(h)}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {finalFb ? (
        <section className="rounded-xl border border-indigo-900/60 bg-indigo-950/30 p-4">
          <h4 className="mb-2 text-xs uppercase tracking-wide text-indigo-400">
            Final coaching feedback
          </h4>
          <p className="text-sm leading-relaxed text-gray-100">{finalFb}</p>
        </section>
      ) : null}

      <details className="rounded-xl border border-gray-700 bg-gray-950/60 p-3 text-xs text-gray-500">
        <summary className="cursor-pointer select-none text-gray-400">
          View full JSON
        </summary>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function VolleyProDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(EMPTY_STATS);
  const [recentVideos, setRecentVideos] = useState<VideoEntry[]>([]);
  const [skillStats, setSkillStats] = useState<SkillStat[]>([]);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }
    setUser(storedUser);
    fetchUserData(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUserData(token: string) {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [statsRes, videosRes, skillRes] = await Promise.all([
        fetch("/api/users/stats", { headers }),
        fetch("/api/users/videos", { headers }),
        fetch("/api/users/skill-stats", { headers }),
      ]);
      if (statsRes.ok) {
        setUserStats((await statsRes.json()) as UserStats);
      }
      if (videosRes.ok) {
        const v = (await videosRes.json()) as { videos: VideoEntry[] };
        setRecentVideos(v.videos);
      }
      if (skillRes.ok) {
        const sk = (await skillRes.json()) as { skill_stats: SkillStat[] };
        setSkillStats(sk.skill_stats);
      }
    } catch {
      /* ignore — stale data is fine */
    }
  }

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  const navigationItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "stats", label: "Statistics" },
    { id: "training", label: "Training" },
    { id: "analysis", label: "Analysis" },
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

  async function handleUpload(file: File) {
    setUploadOpen(false);
    setAppState({ stage: "uploading" });
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploadVideo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
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

  async function handleAnalyzeConfirmed(bbox: Rect, actionType: string) {
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
      const data = await res.json();
      if (!res.ok) {
        setAppState({
          stage: "error",
          message: errorMessage(data.error, "Analysis failed."),
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

      fetchUserData(token);
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

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Player selector modal */}
      {appState.stage === "selecting" && (
        <PlayerSelector
          previewFramePath={appState.previewFrame}
          onConfirm={handleAnalyzeConfirmed}
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
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-lg hover:bg-white/10 text-left"
          >
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
                Welcome back, {user.name}
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
                  ? "Sending full clip to Gemini (may take a minute)…"
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

            {appState.stage === "done" && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-100">
                    Coaching report
                    {appState.action_label ? (
                      <span className="ml-3 text-sm font-normal text-indigo-300">
                        · {appState.action_label}
                      </span>
                    ) : null}
                  </h3>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-sm text-orange-500 hover:text-orange-400"
                  >
                    ← New video
                  </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
                  <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                      Athlete preview
                    </p>
                    <img
                      src={backendAssetUrl(appState.previewFrame)}
                      alt=""
                      className="w-full rounded-lg object-cover"
                    />
                    {typeof appState.overall_score_0_to_10 === "number" && (
                      <p className="mt-4 text-center text-lg font-semibold text-orange-400">
                        Overall ~{appState.overall_score_0_to_10.toFixed(1)}/10
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          from model 0–100
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 space-y-4">
                    <DoneCoachingSummary raw={appState.gemini_feedback} />
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-teal-500 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">
                  {userStats.total_videos}
                </div>
                <div className="text-white/80">Videos Analyzed</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">
                  {userStats.total_videos > 0
                    ? userStats.avg_score.toFixed(1)
                    : "—"}
                </div>
                <div className="text-white/80">Avg AI Score (0–10)</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">
                  {skillStats.length > 0 ? skillStats.length : "—"}
                </div>
                <div className="text-white/80">Skills Tracked</div>
              </div>
              <div className="bg-sky-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl font-bold mb-1">
                  {skillStats.length > 0
                    ? skillStats.reduce(
                        (best, s) =>
                          s.avg_score > best.avg_score ? s : best,
                        skillStats[0],
                      ).skill
                    : "—"}
                </div>
                <div className="text-white/80">Top Skill</div>
              </div>
            </div>

            {/* Recent videos + tips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-100">
                    Recent Videos
                  </h3>
                </div>
                {recentVideos.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    No videos yet. Submit your first video to get started!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentVideos.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className="border-l-4 border-orange-500 flex items-center justify-between p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl shrink-0" />
                          <div>
                            <h4 className="font-semibold text-gray-100">
                              {v.skill_type
                                ? v.skill_type.charAt(0).toUpperCase() +
                                  v.skill_type.slice(1)
                                : "Video"}
                            </h4>
                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-100">
                              <span>
                                {new Date(v.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {v.ai_score !== null ? (
                            <>
                              <div className="text-2xl font-bold text-green-400">
                                {v.ai_score.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-300">Score</div>
                            </>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                              Processing
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              {skillStats.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No skill data yet. Analyze some videos to see your stats here.
                </p>
              ) : (
                <div className="space-y-4">
                  {skillStats.map((s) => (
                    <div key={s.skill} className="p-4 bg-gray-700 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-100">
                          {s.skill.charAt(0).toUpperCase() + s.skill.slice(1)}
                        </h4>
                        <span className="text-2xl font-bold text-orange-600">
                          {s.avg_score.toFixed(1)}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 mb-2">
                        {s.attempts} video{s.attempts !== 1 ? "s" : ""} analyzed
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full"
                          style={{ width: `${(s.avg_score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "training" && (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-100 mb-4">
                Training Plans
              </h3>
              <p className="text-gray-400 text-sm">
                Personalized training plans based on your analysis will appear
                here as you submit more videos.
              </p>
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-100 mb-4">
                Video Analysis History
              </h3>
              {recentVideos.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No analyses yet. Submit a video from the Dashboard to get
                  started.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentVideos.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-gray-100">
                          {v.skill_type
                            ? v.skill_type.charAt(0).toUpperCase() +
                              v.skill_type.slice(1)
                            : "Unknown skill"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(v.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {v.ai_score !== null ? (
                          <span className="text-lg font-bold text-orange-400">
                            {v.ai_score.toFixed(1)}/10
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
