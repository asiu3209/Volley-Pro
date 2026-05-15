import { formatSkillDisplayName } from "@/app/lib/skillLabels";
import type { VideoEntry } from "@/app/types/dashboard";

interface Props {
  videos: VideoEntry[];
  limit?: number;
}

export default function DashboardRecentVideosPanel({
  videos,
  limit = 3,
}: Props) {
  const rows = typeof limit === "number" ? videos.slice(0, limit) : videos;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Recent analyses</h3>
      </div>
      {videos.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No analyses yet. Submit a video from the Dashboard tab to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((v) => (
            <div
              key={v.id}
              className="border-l-4 border-white/30 flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/10 rounded-xl shrink-0" />
                <div>
                  <h4 className="font-semibold text-white">
                    {formatSkillDisplayName(v.skill_type)}
                  </h4>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-gray-400">
                    <span>{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                {v.ai_score !== null ? (
                  <>
                    <div className="text-2xl font-bold text-green-400">
                      {v.ai_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Score</div>
                  </>
                ) : (
                  <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-sm">
                    Processing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
