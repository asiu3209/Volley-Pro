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
      <div className="bg-teal-500 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">{userStats.total_videos}</div>
        <div className="text-white/80">Videos analyzed</div>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">
          {userStats.total_videos > 0 ? userStats.avg_score.toFixed(1) : "—"}
        </div>
        <div className="text-white/80">Average Overall Score </div>
      </div>
      <div className="bg-sky-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">{topSkillLabel}</div>
        <div className="text-white/80">Top skill (by average score)</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">
          {skillStats.length > 0 ? skillStats.length : "—"}
        </div>
        <div className="text-white/80">Skills tracked</div>
      </div>
    </div>
  );
}
