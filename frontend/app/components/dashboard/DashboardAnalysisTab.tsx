import type { VideoEntry } from "@/app/types/dashboard";

interface Props {
  recentVideos: VideoEntry[];
}

export default function DashboardAnalysisTab({ recentVideos }: Props) {
  return (
    <div className="p-6">
      <div className="bg-gray-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4">
          Video Analysis History
        </h3>
        {recentVideos.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No analyses yet. Submit a video from the Dashboard to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {recentVideos.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-100">
                    {v.skill_type
                      ? v.skill_type.charAt(0).toUpperCase() +
                        v.skill_type.slice(1)
                      : "Unknown skill"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  {v.ai_score !== null ? (
                    <span className="text-lg font-bold text-orange-400">
                      {v.ai_score.toFixed(1)}/10
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
