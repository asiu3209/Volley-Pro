"use client";

const NAVIGATION_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "stats", label: "Statistics" },
  { id: "training", label: "Training" },
  { id: "analysis", label: "Analysis" },
] as const;

type Props = {
  activeTab: string;
  onTabChange: (id: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function getNavigationLabel(tabId: string): string | undefined {
  return NAVIGATION_ITEMS.find((i) => i.id === tabId)?.label;
}

export default function DashboardSidebar({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  return (
    <div
      className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-gray-900 to-gray-600 text-white transition-all duration-300 flex flex-col`}
    >
      <div className="p-6 flex items-center justify-between">
        {sidebarOpen && (
          <h1 className="text-orange-600 text-2xl font-bold">VolleyPro</h1>
        )}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 hover:bg-white/10 rounded-lg"
        />
      </div>
      <nav className="flex-1 px-3">
        {NAVIGATION_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-all ${
              activeTab === item.id
                ? "bg-gray-700 text-orange-600 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            {sidebarOpen && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          className="w-full px-4 py-3 rounded-lg hover:bg-white/10 text-left"
        >
          {sidebarOpen && <span>Settings</span>}
        </button>
        <button
          type="button"
          className="w-full px-4 py-3 rounded-lg hover:bg-white/10 text-left"
        >
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
