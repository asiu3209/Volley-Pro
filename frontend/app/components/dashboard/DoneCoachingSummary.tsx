import {
  nonEmptyStrings,
  stripJsonFences,
  type CoachingPayload,
} from "@/app/lib/coachingJson";

interface Props {
  raw: string;
}

export default function DoneCoachingSummary({ raw }: Props) {
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
              const sec =
                typeof h.approximate_seconds === "number"
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
