import { backendAssetUrl } from "@/app/lib/backendUrl";
import { formatSkillDisplayName } from "@/app/lib/skillLabels";
import type { VisionModelResult } from "@/app/types/dashboard";
import DoneCoachingSummary from "./DoneCoachingSummary";

interface Props {
  actionLabel: string | null;
  previewFrame: string;
  overallScore0to10: number | null;
  geminiFeedback: string;
  onNewVideo: () => void;
  visionModel?: VisionModelResult | null;
  /** Full dashboard header + “New video”; `embedded` hides both for history rows. */
  variant?: "page" | "embedded";
}

export default function DashboardCoachingReportSection({
  actionLabel,
  previewFrame,
  overallScore0to10,
  geminiFeedback,
  onNewVideo,
  visionModel,
  variant = "page",
}: Props) {
  const isEmbedded = variant === "embedded";
  const hasPreview = Boolean(previewFrame?.trim());
  const poseOk = Boolean(visionModel?.tracking_ok);

  return (
    <div className={isEmbedded ? "min-w-0" : "mb-8"}>
      {!isEmbedded ? (
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
      ) : null}

      <div
        className={
          hasPreview
            ? "grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]"
            : "min-w-0"
        }
      >
        {hasPreview ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
              Athlete preview
            </p>
            <img
              src={backendAssetUrl(previewFrame)}
              alt=""
              className="w-full rounded-lg object-cover"
            />
            {typeof overallScore0to10 === "number" && (
              <p className="mt-4 text-center text-lg font-semibold text-orange-400">
                Overall ~{overallScore0to10.toFixed(1)}/10
                <span className="ml-1 text-xs font-normal text-gray-500">
                  from model 0–100
                </span>
              </p>
            )}
            {poseOk && visionModel?.predicted_skill ? (
              <p className="mt-3 text-center text-xs text-gray-400">
                Pose model:{" "}
                {formatSkillDisplayName(visionModel.predicted_skill)}
                {typeof visionModel.skill_confidence === "number"
                  ? ` (${Math.round(visionModel.skill_confidence * 100)}%)`
                  : ""}
                {typeof visionModel.overall_quality_0_to_100 === "number"
                  ? ` · kinematics ~${visionModel.overall_quality_0_to_100.toFixed(0)}/100`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="min-w-0 space-y-4">
          <DoneCoachingSummary raw={geminiFeedback} />
        </div>
      </div>
    </div>
  );
}
