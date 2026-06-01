/**
 * Public Supabase Storage URLs for per-skill reference stills.
 * Path layout must match backend `app/services/gemini.py` (_REFERENCE_TYPES + _reference_urls).
 */
const REFERENCE_SKILL_PATHS: Record<string, { folder: string; stem: string }> = {
  blocks: { folder: "blocks", stem: "block" },
  digs: { folder: "digs", stem: "dig" },
  pins: { folder: "pins", stem: "hit" },
  setters: { folder: "setters", stem: "setter" },
  serves: { folder: "serves", stem: "serve" },
};

function supabasePublicStorageBase(): string | null {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!projectUrl) return null;
  const bucket =
    process.env.NEXT_PUBLIC_REFERENCE_IMAGE_BUCKET ?? "reference-images";
  return `${projectUrl}/storage/v1/object/public/${bucket}`;
}

/**
 * First reference still for a skill (e.g. blocks/block1.webp).
 */
export function getReferenceImageUrl(
  skillType: string | null | undefined,
  imageIndex = 1,
): string | null {
  const key = skillType?.trim().toLowerCase();
  if (!key) return null;
  const meta = REFERENCE_SKILL_PATHS[key];
  if (!meta) return null;

  const base = supabasePublicStorageBase();
  if (!base) return null;

  const ext = (
    process.env.NEXT_PUBLIC_REFERENCE_IMAGE_EXT ?? "webp"
  ).replace(/^\./, "");
  const fileName = `${meta.stem}${imageIndex}.${ext}`;
  const path = `${meta.folder}/${fileName}`;
  return `${base}/${path}`;
}

export function hasReferenceImage(skillType: string | null | undefined): boolean {
  const key = skillType?.trim().toLowerCase();
  return Boolean(key && REFERENCE_SKILL_PATHS[key]);
}
