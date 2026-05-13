import type { AppState } from "@/app/types/dashboard";

interface Props {
  appState: AppState;
  onDismissError: () => void;
}

export default function DashboardActivityBanners({
  appState,
  onDismissError,
}: Props) {
  return (
    <>
      {(appState.stage === "uploading" || appState.stage === "analyzing") && (
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
          {appState.stage === "uploading" ? "Uploading video…" : null}
          {appState.stage === "analyzing"
            ? "Sending full clip to Gemini (may take a minute)…"
            : null}
        </div>
      )}

      {appState.stage === "error" && (
        <div className="mb-6 rounded-xl bg-red-900/40 border border-red-500 p-4 text-red-200 flex justify-between gap-4">
          <span>{appState.message}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="text-sm underline ml-4 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
