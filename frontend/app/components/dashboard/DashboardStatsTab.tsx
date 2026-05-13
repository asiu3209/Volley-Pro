import type { SkillStat } from "@/app/types/dashboard";

interface Props {
  skillStats: SkillStat[];
}

export default function DashboardStatsTab({ skillStats }: Props) {
  return (
    <div className="p-6">
      <div className="bg-gray-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-6">
          Performance Overview
        </h3>
        {skillStats.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No skill data yet. Analyze some videos to see your stats here.
          </p>
        ) : (
          <div className="space-y-4">
            {skillStats.map((s) => (
              <div key={s.skill} className="p-4 bg-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-100">
                    {s.skill.charAt(0).toUpperCase() + s.skill.slice(1)}
                  </h4>
                  <span className="text-2xl font-bold text-orange-600">
                    {s.avg_score.toFixed(1)}/10
                  </span>
                </div>
                <p className="text-sm text-gray-200 mb-2">
                  {s.attempts} video{s.attempts !== 1 ? "s" : ""} analyzed
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full"
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
