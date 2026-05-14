/**
 * Turn API skill slugs ("dig", "setter_run") into readable labels ("Dig", "Setter Run").
 */
export function formatSkillDisplayName(skill: string | null | undefined): string {
  if (!skill?.trim()) return "Unknown skill";
  return skill
    .trim()
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
