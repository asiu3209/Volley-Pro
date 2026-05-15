import { formatSkillDisplayName } from "@/app/lib/skillLabels";
import type { SkillStat } from "@/app/types/dashboard";

interface Props {
  skillStats: SkillStat[];
}

export default function DashboardStatsTab({ skillStats }: Props) {
  return (
    <div className="p-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">
          Performance Overview
        </h3>
        {skillStats.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No skill data yet. Analyze some videos to see your stats here.
          </p>
        ) : (
          <div className="space-y-4">
            {skillStats.map((s) => (
              <div key={s.skill} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">
                    {formatSkillDisplayName(s.skill)}
                  </h4>
                  <span className="text-2xl font-bold text-green-400">
                    {s.avg_score.toFixed(1)}/10
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  {s.attempts} video{s.attempts !== 1 ? "s" : ""} analyzed
                </p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full"
                    style={{ width: `${(s.avg_score / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
