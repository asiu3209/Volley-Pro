"use client";

import { useDashboardData } from "@/app/context/DashboardDataContext";

export default function TrainingHistoryTab() {
  const { trainingHistory, clearTrainingHistory } = useDashboardData();

  if (trainingHistory.length === 0) {
    return (
      <div className="p-6 text-gray-400">
        No training recommendations yet. Each time you complete a video
        analysis, AI-recommended YouTube clips are saved here and persist after
        refresh.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-100">
          Training & YouTube picks
        </h2>
        <button
          type="button"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm("Clear all saved training sessions?")
            ) {
              clearTrainingHistory();
            }
          }}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-6">
        {trainingHistory.map((session) => (
          <li
            key={session.id}
            className="rounded-xl border border-gray-700 bg-gray-800/60 p-5"
          >
            <p className="text-sm text-gray-500">
              {new Date(session.savedAt).toLocaleString()}
              {session.actionLabel ? (
                <span className="text-gray-300">
                  {" "}
                  · {session.actionLabel}
                </span>
              ) : null}
            </p>
            {session.recommendations.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">
                No YouTube links in this run (model may have omitted them).
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {session.recommendations.map((r) => (
                  <li
                    key={`${session.id}-${r.url}`}
                    className="rounded-lg border border-gray-600 bg-gray-900/40 p-3"
                  >
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      {r.title}
                    </a>
                    {r.channel ? (
                      <p className="text-xs text-gray-500 mt-1">{r.channel}</p>
                    ) : null}
                    {r.reason ? (
                      <p className="text-sm text-gray-300 mt-2">{r.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
