/** Display helpers for VolleyPro scores (Gemini returns 0–100). */

export function clampScore100(score: number | null | undefined): number | null {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(Number(score) * 10) / 10));
}

export function formatScore100(score: number | null | undefined): string {
  const n = clampScore100(score);
  if (n === null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function scoreBarPercent(score: number | null | undefined): number {
  return clampScore100(score) ?? 0;
}
