"use client";

import { useState } from "react";

import DoneCoachingSummary from "@/app/components/DoneCoachingSummary";
import { clientAssetUrl } from "@/app/lib/clientAssetUrl";
import { useDashboardData } from "@/app/context/DashboardDataContext";

export default function AnalysisHistoryTab() {
  const { analysisHistory, clearAnalysisHistory } = useDashboardData();
  const [openId, setOpenId] = useState<string | null>(null);

  if (analysisHistory.length === 0) {
    return (
      <div className="p-6 text-gray-400">
        No analyses yet. Run an analysis from the Dashboard tab; results are
        saved here and persist after refresh.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-100">Analysis history</h2>
        <button
          type="button"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm("Clear all saved analyses?")
            ) {
              clearAnalysisHistory();
              setOpenId(null);
            }
          }}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-3">
        {analysisHistory.map((item) => {
          const expanded = openId === item.id;
          return (
            <li
              key={item.id}
              className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : item.id)}
                className="flex w-full items-center gap-4 p-4 text-left hover:bg-gray-800/90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- proxied /api/asset URL */}
                <img
                  src={clientAssetUrl(item.previewFrameKey)}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-100">
                    {item.actionLabel ?? item.actionType ?? "Analysis"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.savedAt).toLocaleString()} ·{" "}
                    {item.videoFilename}
                  </p>
                  {typeof item.score0to10 === "number" && (
                    <p className="mt-1 text-sm text-orange-400">
                      Score ~{item.score0to10.toFixed(1)}/10
                    </p>
                  )}
                </div>
                <span className="text-gray-500 text-sm shrink-0">
                  {expanded ? "▲" : "▼"}
                </span>
              </button>
              {expanded && (
                <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                  <DoneCoachingSummary
                    raw={item.coachingRaw}
                    parsed={item.coachingParsed}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
