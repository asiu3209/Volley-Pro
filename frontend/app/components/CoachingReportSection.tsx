"use client";

import DoneCoachingSummary from "@/app/components/DoneCoachingSummary";
import { clientAssetUrl } from "@/app/lib/clientAssetUrl";
import type { CoachingPayload } from "@/app/types/coaching";

type Props = {
  previewFrameKey: string;
  coachingParsed: CoachingPayload | null;
  coachingRaw: string;
  overallScore0To10: number | null;
  actionLabel: string | null;
  onNewVideo: () => void;
};

export default function CoachingReportSection({
  previewFrameKey,
  coachingParsed,
  coachingRaw,
  overallScore0To10,
  actionLabel,
  onNewVideo,
}: Props) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-100">
          Coaching report
          {actionLabel ? (
            <span className="ml-3 text-sm font-normal text-indigo-300">
              · {actionLabel}
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={onNewVideo}
          className="text-sm text-orange-500 hover:text-orange-400"
        >
          ← New video
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
            Athlete preview
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- proxied /api/asset URL */}
          <img
            src={clientAssetUrl(previewFrameKey)}
            alt=""
            className="w-full rounded-lg object-cover"
          />
          {typeof overallScore0To10 === "number" && (
            <p className="mt-4 text-center text-lg font-semibold text-orange-400">
              Overall ~{overallScore0To10.toFixed(1)}/10
              <span className="ml-1 text-xs font-normal text-gray-500">
                from model 0–100
              </span>
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <DoneCoachingSummary
            raw={coachingRaw}
            parsed={coachingParsed ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
