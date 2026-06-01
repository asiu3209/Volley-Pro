import {
  nonEmptyStrings,
  stripJsonFences,
  type CoachingPayload,
} from "@/app/lib/coachingJson";

export type CoachingInsights = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
};

export function parseCoachingInsights(raw: string | null | undefined): CoachingInsights {
  const empty: CoachingInsights = { summary: "", strengths: [], weaknesses: [] };
  if (!raw?.trim()) return empty;

  try {
    const data = JSON.parse(stripJsonFences(raw)) as CoachingPayload;
    const summary =
      (typeof data.analysis_summary === "string"
        ? data.analysis_summary.trim()
        : "") ||
      (typeof data.final_coaching_feedback === "string"
        ? data.final_coaching_feedback.trim()
        : "");
    return {
      summary,
      strengths: nonEmptyStrings(data.strengths),
      weaknesses: nonEmptyStrings(data.weaknesses),
    };
  } catch {
    return empty;
  }
}

/** Prefer a real display name over the auto-created backend default. */
export function resolveDisplayName(
  profileName: string | null | undefined,
  authName: string | null | undefined,
): string {
  const p = profileName?.trim();
  const a = authName?.trim();
  if (p && p.toLowerCase() !== "volleypro player") return p;
  if (a) return a;
  return p || "Player";
}
