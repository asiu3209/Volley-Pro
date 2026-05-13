"use client";

import PlayerSelector from "@/app/components/Playerselector";
import DashboardAnalysisTab from "@/app/components/dashboard/DashboardAnalysisTab";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import DashboardMainTab from "@/app/components/dashboard/DashboardMainTab";
import DashboardSidebar from "@/app/components/dashboard/DashboardSidebar";
import DashboardStatsTab from "@/app/components/dashboard/DashboardStatsTab";
import DashboardTrainingTab from "@/app/components/dashboard/DashboardTrainingTab";
import { useVolleyDashboard } from "@/app/dashboard/hooks/useVolleyDashboard";

export default function VolleyProDashboard() {
  const {
    user,
    activeTab,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    uploadOpen,
    setUploadOpen,
    appState,
    userStats,
    skillStats,
    recentVideos,
    dashboardTips,
    handleLogout,
    reset,
    openUploadFlow,
    handleUpload,
    handleAnalyzeConfirmed,
  } = useVolleyDashboard();

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-900">
      {appState.stage === "selecting" && (
        <PlayerSelector
          previewFramePath={appState.previewFrame}
          onConfirm={handleAnalyzeConfirmed}
          onCancel={reset}
        />
      )}

      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-auto">
        <DashboardHeader
          activeTab={activeTab}
          userName={user.name}
          uploadOpen={uploadOpen}
          onCloseUpload={() => setUploadOpen(false)}
          onOpenUpload={openUploadFlow}
          onUpload={handleUpload}
        />

        {activeTab === "dashboard" && (
          <DashboardMainTab
            appState={appState}
            userStats={userStats}
            skillStats={skillStats}
            recentVideos={recentVideos}
            dashboardTips={dashboardTips}
            onDismissError={reset}
            onNewVideoFromReport={reset}
          />
        )}

        {activeTab === "stats" && <DashboardStatsTab skillStats={skillStats} />}

        {activeTab === "training" && <DashboardTrainingTab />}

        {activeTab === "analysis" && (
          <DashboardAnalysisTab recentVideos={recentVideos} />
        )}
      </div>
    </div>
  );
}
