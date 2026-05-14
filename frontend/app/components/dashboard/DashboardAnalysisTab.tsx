"use client";

import { useState } from "react";

import DashboardCoachingReportSection from "@/app/components/dashboard/DashboardCoachingReportSection";
import { formatSkillDisplayName } from "@/app/lib/skillLabels";
import type { VideoEntry } from "@/app/types/dashboard";

interface Props {
  recentVideos: VideoEntry[];
}

function skillHeading(entry: VideoEntry): string {
  if (entry.action_label?.trim()) return entry.action_label.trim();
  return formatSkillDisplayName(entry.skill_type);
}

export default function DashboardAnalysisTab({ recentVideos }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="p-6">
      <div className="bg-gray-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-1">
          Video analysis history
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Same coaching layout as after each analysis — saved on this device. Expand a
          row to view the report (preview may be missing for older runs after files are
          removed on the server).
        </p>
        {recentVideos.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No analyses yet. Submit a video from the Dashboard tab to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {recentVideos.map((v) => {
              const expanded = openId === v.id;
              const feedback =
                typeof v.gemini_feedback === "string" ? v.gemini_feedback.trim() : "";
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-gray-600 bg-gray-700/80 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId((cur) => (cur === v.id ? null : v.id))
                    }
                    className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-600/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-100 truncate">
                        {skillHeading(v)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {v.ai_score !== null && v.ai_score !== undefined ? (
                        <span className="text-lg font-bold text-orange-400 tabular-nums">
                          {v.ai_score.toFixed(1)}/10
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                      <span className="text-gray-400 text-sm" aria-hidden>
                        {expanded ? "▾" : "▸"}
                      </span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-gray-600 bg-gray-900/40 px-3 pb-4 pt-2">
                      {feedback ? (
                        <DashboardCoachingReportSection
                          actionLabel={
                            v.action_label?.trim() ??
                            formatSkillDisplayName(v.skill_type)
                          }
                          previewFrame={v.preview_frame?.trim() ?? ""}
                          overallScore0to10={v.ai_score}
                          geminiFeedback={feedback}
                          onNewVideo={() => {}}
                          variant="embedded"
                        />
                      ) : (
                        <p className="text-sm text-gray-400 px-1 py-4">
                          No saved report text for this run. New analyses include the
                          full coaching output automatically.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
