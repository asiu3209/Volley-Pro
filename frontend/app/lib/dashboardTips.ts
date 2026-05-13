import {
  nonEmptyStrings,
  stripJsonFences,
  type CoachingPayload,
} from "@/app/lib/coachingJson";

export type TipPriority = "high" | "medium" | "low";

export interface DashboardTip {
  id: string;
  issue: string;
  recommendation: string;
  priority: TipPriority;
}

const DASHBOARD_TIPS_SESSION_KEY = "volleypro_dashboard_tips_v1";

export function readPersistedDashboardTips(): DashboardTip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(DASHBOARD_TIPS_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is DashboardTip =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as DashboardTip).id === "string" &&
        typeof (x as DashboardTip).issue === "string" &&
        typeof (x as DashboardTip).recommendation === "string" &&
        typeof (x as DashboardTip).priority === "string",
    );
  } catch {
    return [];
  }
}

export function persistDashboardTips(tips: DashboardTip[]) {
  if (typeof window === "undefined") return;
  try {
    if (tips.length === 0) {
      sessionStorage.removeItem(DASHBOARD_TIPS_SESSION_KEY);
    } else {
      sessionStorage.setItem(
        DASHBOARD_TIPS_SESSION_KEY,
        JSON.stringify(tips),
      );
    }
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedDashboardTips() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DASHBOARD_TIPS_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function normalizeTipPriority(p: unknown): TipPriority {
  if (typeof p !== "string") return "medium";
  const x = p.toLowerCase().trim();
  if (x === "high") return "high";
  if (x === "low") return "low";
  return "medium";
}

/** From latest Gemini coaching JSON (improvement_tips, else weaknesses). */
export function parseImprovementTipsFromGemini(raw: string): DashboardTip[] {
  let data: CoachingPayload | null = null;
  try {
    data = JSON.parse(stripJsonFences(raw)) as CoachingPayload;
  } catch {
    return [];
  }
  if (!data) return [];

  const fromModel: DashboardTip[] = [];
  const tipsRaw = data.improvement_tips;
  if (Array.isArray(tipsRaw)) {
    tipsRaw.forEach((item, i) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      const o = item as Record<string, unknown>;
      const issue = typeof o.issue === "string" ? o.issue.trim() : "";
      const rec =
        typeof o.recommendation === "string" ? o.recommendation.trim() : "";
      if (!issue && !rec) return;
      fromModel.push({
        id: `tip-${i}`,
        issue: issue || "Focus area",
        recommendation: rec || issue,
        priority: normalizeTipPriority(o.priority),
      });
    });
  }
  if (fromModel.length > 0) return fromModel;

  const weaknesses = nonEmptyStrings(data.weaknesses);
  return weaknesses.map((w, i) => ({
    id: `weakness-${i}`,
    issue: w,
    recommendation: "",
    priority: "medium" as const,
  }));
}
