import { formatSkillDisplayName } from "@/app/lib/skillLabels";
import type { SkillStat, UserStats } from "@/app/types/dashboard";

interface Props {
  userStats: UserStats;
  skillStats: SkillStat[];
}

export default function DashboardStatsCards({ userStats, skillStats }: Props) {
  const topSkillRaw =
    skillStats.length > 0
      ? skillStats.reduce(
          (best, s) => (s.avg_score > best.avg_score ? s : best),
          skillStats[0],
        ).skill
      : null;
  const topSkillLabel =
    topSkillRaw !== null ? formatSkillDisplayName(topSkillRaw) : "—";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <div className="text-3xl font-bold text-white mb-1">{userStats.total_videos}</div>
        <div className="text-gray-400 text-sm">Videos analyzed</div>
      </div>
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <div className="text-3xl font-bold text-white mb-1">
          {userStats.total_videos > 0 ? userStats.avg_score.toFixed(1) : "—"}
        </div>
        <div className="text-gray-400 text-sm">Average overall score</div>
      </div>
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <div className="text-3xl font-bold text-white mb-1">{topSkillLabel}</div>
        <div className="text-gray-400 text-sm">Top skill</div>
      </div>
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <div className="text-3xl font-bold text-white mb-1">
          {skillStats.length > 0 ? skillStats.length : "—"}
        </div>
        <div className="text-gray-400 text-sm">Skills tracked</div>
      </div>
    </div>
  );
}
