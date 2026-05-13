import type { DashboardTip } from "@/app/lib/dashboardTips";
import type {
  AppState,
  SkillStat,
  UserStats,
  VideoEntry,
} from "@/app/types/dashboard";
import DashboardActivityBanners from "./DashboardActivityBanners";
import DashboardCoachingReportSection from "./DashboardCoachingReportSection";
import DashboardImprovementTips from "./DashboardImprovementTips";
import DashboardRecentVideosPanel from "./DashboardRecentVideosPanel";
import DashboardStatsCards from "./DashboardStatsCards";

interface Props {
  appState: AppState;
  userStats: UserStats;
  skillStats: SkillStat[];
  recentVideos: VideoEntry[];
  dashboardTips: DashboardTip[];
  onDismissError: () => void;
  onNewVideoFromReport: () => void;
}

export default function DashboardMainTab({
  appState,
  userStats,
  skillStats,
  recentVideos,
  dashboardTips,
  onDismissError,
  onNewVideoFromReport,
}: Props) {
  const hasTips = dashboardTips.length > 0;

  return (
    <div className="p-6 bg-gray-900">
      <DashboardActivityBanners
        appState={appState}
        onDismissError={onDismissError}
      />

      {appState.stage === "done" && (
        <DashboardCoachingReportSection
          actionLabel={appState.action_label}
          previewFrame={appState.previewFrame}
          overallScore0to10={appState.overall_score_0_to_10}
          geminiFeedback={appState.gemini_feedback}
          onNewVideo={onNewVideoFromReport}
        />
      )}

      <DashboardStatsCards userStats={userStats} skillStats={skillStats} />

      <div
        className={`grid grid-cols-1 gap-6 ${hasTips ? "lg:grid-cols-3" : ""}`}
      >
        <div className={hasTips ? "lg:col-span-2" : ""}>
          <DashboardRecentVideosPanel videos={recentVideos} limit={3} />
        </div>
        {hasTips ? <DashboardImprovementTips tips={dashboardTips} /> : null}
      </div>
    </div>
  );
}
