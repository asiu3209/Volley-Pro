"use client";

import CoachingReportSection from "@/app/components/CoachingReportSection";
import type { AppState } from "@/app/components/dashboard/types";

type Props = {
  appState: AppState;
  onReset: () => void;
};

function ProgressBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-xl bg-indigo-900/40 border border-indigo-500 p-4 text-indigo-200 flex items-center gap-3">
      <svg
        className="animate-spin h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
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
      {message}
    </div>
  );
}

export default function DashboardTabContent({ appState, onReset }: Props) {
  return (
    <div className="p-6 bg-gray-900">
      {(appState.stage === "uploading" || appState.stage === "analyzing") && (
        <ProgressBanner
          message={
            appState.stage === "uploading"
              ? "Uploading video…"
              : "Sending full clip to Gemini (may take a minute)…"
          }
        />
      )}

      {appState.stage === "error" && (
        <div className="mb-6 rounded-xl bg-red-900/40 border border-red-500 p-4 text-red-200 flex justify-between">
          <span>{appState.message}</span>
          <button
            type="button"
            onClick={onReset}
            className="text-sm underline ml-4 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {appState.stage === "done" && (
        <CoachingReportSection
          previewFrameKey={appState.previewFrameKey}
          coachingParsed={appState.coachingParsed}
          coachingRaw={appState.coachingRaw}
          overallScore0To10={appState.overall_score_0_to_10}
          actionLabel={appState.action_label}
          onNewVideo={onReset}
        />
      )}

      {appState.stage === "idle" && (
        <p className="text-gray-400">
          Upload a video with{" "}
          <span className="text-gray-200">Submit Video</span> to get a coaching
          report.
        </p>
      )}
    </div>
  );
}
