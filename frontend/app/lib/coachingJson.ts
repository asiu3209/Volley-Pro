export type CoachingPayload = Record<string, unknown>;

export function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  return t.trim();
}

export function nonEmptyStrings(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
}
