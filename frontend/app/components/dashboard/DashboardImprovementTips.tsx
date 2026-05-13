import type { DashboardTip } from "@/app/lib/dashboardTips";

interface Props {
  tips: DashboardTip[];
}

export default function DashboardImprovementTips({ tips }: Props) {
  if (tips.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-gray-100 mb-6">
        Improvement Tips
      </h3>
      <p className="mb-4 text-xs text-gray-500">From your latest video review.</p>
      <div className="space-y-4">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl border-l-4 border-orange-500"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-gray-100 text-sm">{tip.issue}</h4>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                  tip.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : tip.priority === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {tip.priority}
              </span>
            </div>
            {tip.recommendation ? (
              <p className="text-xs leading-relaxed text-gray-200">
                {tip.recommendation}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
