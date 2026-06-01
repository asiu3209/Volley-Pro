"use client";

import { useEffect, useState } from "react";

import { backendAssetUrl } from "@/app/lib/backendUrl";
import { getReferenceImageUrl } from "@/app/lib/referenceImages";
import { formatSkillDisplayName } from "@/app/lib/skillLabels";

interface Props {
  skillType: string | null | undefined;
  previewFrame?: string | null;
  className?: string;
}

export default function ReferenceSkillThumbnail({
  skillType,
  previewFrame,
  className = "w-16 h-16",
}: Props) {
  const referenceSrc = getReferenceImageUrl(skillType, 1);
  const previewSrc = previewFrame?.trim()
    ? backendAssetUrl(previewFrame)
    : null;
  const [src, setSrc] = useState<string | null>(referenceSrc ?? previewSrc);
  const label = formatSkillDisplayName(skillType);

  useEffect(() => {
    setSrc(referenceSrc ?? previewSrc);
  }, [referenceSrc, previewSrc]);

  if (!src) {
    return (
      <div
        className={`${className} shrink-0 rounded-xl bg-white/10 flex items-center justify-center`}
        aria-hidden
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 px-1 text-center">
          {label.slice(0, 3)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40`}
    >
      <img
        src={src}
        alt={`${label} reference`}
        className="h-full w-full object-cover"
        onError={() => {
          if (src === referenceSrc && previewSrc) {
            setSrc(previewSrc);
            return;
          }
          setSrc(null);
        }}
      />
    </div>
  );
}
