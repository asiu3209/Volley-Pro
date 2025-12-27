"use client";

import { useState } from "react";
import {
  Home,
  Video,
  BarChart3,
  Target,
  Trophy,
  Upload,
  Play,
  TrendingUp,
  Award,
  Zap,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import UploadVideo from "./components/UploadVideo/UploadVideo";

const VolleyProDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [open, setOpen] = useState(false);

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "videos", label: "My Videos", icon: Video },
    { id: "stats", label: "Statistics", icon: BarChart3 },
    { id: "training", label: "Training", icon: Target },
    { id: "analysis", label: "Analysis", icon: TrendingUp },
  ];

  const recentVideos = [
    {
      id: 1,
      title: "Spike Technique - Practice",
      skill: "Spike",
      date: "2024-01-15",
      status: "completed",
      score: 8.5,
    },
    {
      id: 2,
      title: "Serve Analysis",
      skill: "Serve",
      date: "2024-01-14",
      status: "analyzing",
      score: null,
    },
    {
      id: 3,
      title: "Block Training",
      skill: "Block",
      date: "2024-01-13",
      status: "completed",
      score: 7.8,
    },
  ];

  const statsData = [
    { skill: "Serve", attempts: 150, success: 127, rate: 84.7 },
    { skill: "Spike", attempts: 200, success: 156, rate: 78.0 },
    { skill: "Block", attempts: 180, success: 142, rate: 78.9 },
    { skill: "Dig", attempts: 220, success: 189, rate: 85.9 },
  ];

  const tips = [
    {
      id: 1,
      title: "Perfect Your Serve Toss",
      skill: "Serve",
      priority: "high",
    },
    {
      id: 2,
      title: "Improve Approach Timing",
      skill: "Spike",
      priority: "medium",
    },
    {
      id: 3,
      title: "Strengthen Core for Blocks",
      skill: "Block",
      priority: "low",
    },
  ];

  function handleUpload(file: File) {
    console.log("Uploaded File: " + file);
    //Submit to backend for analysis
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-gray-900 to-gray-600 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-orange-600 text-2xl font-bold">VolleyPro</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                  activeTab === item.id
                    ? "bg-gray-700 text-orange-600 shadow-lg"
                    : "hover:bg-white/10"
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10">
            <Settings size={20} />
            {sidebarOpen && <span>Settings</span>}
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10">
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-gray-900 shadow-sm p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-100">
                {navigationItems.find((item) => item.id === activeTab)?.label}
              </h2>
              <p className="text-gray-300 mt-1">
                Track, analyze, and improve your volleyball skills
              </p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
            >
              Submit Video
            </button>

            <UploadVideo
              isOpen={open}
              onClose={() => setOpen(false)}
              onUpload={handleUpload}
            />
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <div className="p-6 bg-gray-900">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient bg-teal-500 text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Video size={24} />
                  </div>
                  <TrendingUp className="text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">24</div>
                <div className="text-blue-100">Videos Analyzed</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Trophy size={24} />
                  </div>
                  <TrendingUp className="text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">81.5%</div>
                <div className="text-green-100">Overall Success Rate</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap size={24} />
                  </div>
                  <TrendingUp className="text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">12</div>
                <div className="text-purple-100">Training Sessions</div>
              </div>

              <div className="bg-gradient bg-sky-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Award size={24} />
                  </div>
                  <TrendingUp className="text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">8.2</div>
                <div className="text-orange-100">Average Score</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Videos */}
              <div className="lg:col-span-2 bg-gray-800 rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-100">
                    Recent Videos
                  </h3>
                  <button className="text-orange-600 hover:text-orange-700 font-semibold text-sm">
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {recentVideos.map((video) => (
                    <div
                      key={video.id}
                      className="border-l-4 border-orange-500 flex items-center justify-between p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <Play className="text-white" size={24} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-100">
                            {video.title}
                          </h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-sm text-gray-100">
                              {video.skill}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-100">
                              {video.date}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {video.status === "completed" ? (
                          <div>
                            <div className="text-2xl font-bold text-green-400">
                              {video.score}
                            </div>
                            <div className="text-xs text-gray-300">Score</div>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            Analyzing...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvement Tips */}
              <div className="bg-gray-800 rounded-2xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-100 mb-6">
                  Improvement Tips
                </h3>
                <div className="space-y-4">
                  {tips.map((tip) => (
                    <div
                      key={tip.id}
                      className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl border-l-4 border-orange-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-100 text-sm">
                          {tip.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
                      <p className="text-xs text-gray-200">{tip.skill}</p>
                      <button className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-semibold">
                        Learn More →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Content */}
        {activeTab === "stats" && (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-100 mb-6">
                Performance Overview
              </h3>
              <div className="space-y-4">
                {statsData.map((stat) => (
                  <div key={stat.skill} className="p-4 bg-gray-700 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-100">
                        {stat.skill}
                      </h4>
                      <span className="text-2xl font-bold text-orange-600">
                        {stat.rate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-200 mb-2">
                      <span>
                        {stat.success} / {stat.attempts} successful
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                        style={{ width: `${stat.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Videos Content */}
        {activeTab === "videos" && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all"
                >
                  <div className="h-48 bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                    <Play className="text-white" size={48} />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 mb-2">
                      {video.title}
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{video.skill}</span>
                      {video.score && (
                        <span className="font-bold text-orange-600">
                          {video.score}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolleyProDashboard;
