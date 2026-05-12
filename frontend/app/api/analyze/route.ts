import { NextRequest, NextResponse } from "next/server";

import {
  extractYoutubeRecommendations,
  parseCoachingPayload,
} from "@/app/lib/coachingPayload";
import { getInternalBackendUrl } from "@/app/lib/serverBackend";

function scoreFromPython(
  overallScore0To10: unknown,
  coachingRaw: string,
): number | null {
  if (
    typeof overallScore0To10 === "number" &&
    Number.isFinite(overallScore0To10)
  ) {
    return overallScore0To10;
  }
  const parsed = parseCoachingPayload(coachingRaw);
  if (!parsed) return null;
  const raw = parsed.overall_score;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.max(0, Math.min(10, raw / 10));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backend = getInternalBackendUrl();
    const response = await fetch(`${backend}/videos/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json(
        { error: (data.detail as string) ?? "Analysis failed" },
        { status: response.status },
      );
    }

    const coachingRaw =
      typeof data.gemini_feedback === "string" ? data.gemini_feedback : "";
    const coachingParsed = parseCoachingPayload(coachingRaw);
    const score0to10 = scoreFromPython(data.overall_score_0_to_10, coachingRaw);
    const actionType =
      typeof data.action_type === "string" ? data.action_type : null;
    const actionLabel =
      typeof data.action_label === "string" ? data.action_label : null;
    const recommendations = extractYoutubeRecommendations(coachingParsed);

    const payload = {
      analysis: {
        actionType,
        actionLabel,
        score0to10,
        coachingParsed,
        coachingRaw,
      },
      training: {
        recommendations,
      },
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Analysis request failed" },
      { status: 500 },
    );
  }
}
