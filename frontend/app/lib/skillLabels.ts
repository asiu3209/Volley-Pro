/**
 * Turn API skill slugs into readable coach-facing labels.
 * Internal key "digs" displays as Pass (not Dig) — digs are one kind of pass.
 */
const SKILL_DISPLAY_OVERRIDES: Record<string, string> = {
  digs: "Pass",
  dig: "Pass",
};

export function formatSkillDisplayName(skill: string | null | undefined): string {
  if (!skill?.trim()) return "Unknown skill";
  const key = skill.trim().toLowerCase();
  if (SKILL_DISPLAY_OVERRIDES[key]) return SKILL_DISPLAY_OVERRIDES[key];
  return key
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
