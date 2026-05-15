import type { DashboardNavItem } from "@/app/types/dashboard";

/** Set to true when the settings tab / panel is ready to ship. */
export const SHOW_SETTINGS_IN_SIDEBAR = false;

/** Set to true when the training tab is ready to ship. */
export const SHOW_TRAINING_IN_SIDEBAR = false;

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "stats", label: "Statistics" },
  { id: "training", label: "Training" },
  { id: "analysis", label: "Analysis" },
];

export function visibleDashboardNavItems(): DashboardNavItem[] {
  return DASHBOARD_NAV_ITEMS.filter((item) => {
    if (item.id === "training" && !SHOW_TRAINING_IN_SIDEBAR) return false;
    return true;
  });
}
