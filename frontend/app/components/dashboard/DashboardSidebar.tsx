import { DASHBOARD_NAV_ITEMS } from "./navConfig";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
}

export default function DashboardSidebar({
  sidebarOpen,
  onToggleSidebar,
  activeTab,
  onTabChange,
  onLogout,
}: Props) {
  return (
    <div
      className={`${sidebarOpen ? "w-64" : "w-20"} bg-[#0f1117] border-r border-white/10 text-white transition-all duration-300 flex flex-col`}
    >
      <div className="p-6 flex items-center justify-between">
        {sidebarOpen && (
          <h1 className="text-white text-2xl font-semibold tracking-tight">VolleyPro</h1>
        )}
        <button
          type="button"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          onClick={onToggleSidebar}
          className="p-2 hover:bg-white/10 rounded-lg"
        />
      </div>
      <nav className="flex-1 px-3">
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-all ${
              activeTab === item.id
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
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
          onClick={onLogout}
          className="w-full px-4 py-3 rounded-lg hover:bg-white/10 text-left"
        >
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
