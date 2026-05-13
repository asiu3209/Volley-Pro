import type { SkillStat, UserStats } from "@/app/types/dashboard";

interface Props {
  userStats: UserStats;
  skillStats: SkillStat[];
}

export default function DashboardStatsCards({
  userStats,
  skillStats,
}: Props) {
  const topSkill =
    skillStats.length > 0
      ? skillStats.reduce(
          (best, s) => (s.avg_score > best.avg_score ? s : best),
          skillStats[0],
        ).skill
      : "—";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-teal-500 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">{userStats.total_videos}</div>
        <div className="text-white/80">Videos Analyzed</div>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">
          {userStats.total_videos > 0 ? userStats.avg_score.toFixed(1) : "—"}
        </div>
        <div className="text-white/80">Avg AI Score (0–10)</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">
          {skillStats.length > 0 ? skillStats.length : "—"}
        </div>
        <div className="text-white/80">Skills Tracked</div>
      </div>
      <div className="bg-sky-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="text-3xl font-bold mb-1">{topSkill}</div>
        <div className="text-white/80">Top Skill</div>
      </div>
    </div>
  );
}
