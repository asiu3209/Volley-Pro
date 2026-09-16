/**
 * Turn API skill storage keys into coach-facing labels for Top skill / stats / history.
 * Prefer: Serve, Set, Block, Attack, Pass (never raw keys like "pins" or "digs").
 */
const SKILL_LABEL_OVERRIDES: Record<string, string> = {
  digs: "Pass",
  dig: "Pass",
  pins: "Attack",
  pin: "Attack",
  hit: "Attack",
  hits: "Attack",
  setters: "Set",
  setter: "Set",
  set: "Set",
  blocks: "Block",
  block: "Block",
  serves: "Serve",
  serve: "Serve",
};

export function formatSkillDisplayName(skill: string | null | undefined): string {
  if (!skill?.trim()) return "Unknown skill";
  const key = skill.trim().toLowerCase();
  if (SKILL_LABEL_OVERRIDES[key]) return SKILL_LABEL_OVERRIDES[key];
  return key
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
