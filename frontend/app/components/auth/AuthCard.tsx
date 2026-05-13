import type { ReactNode } from "react";

type Tab = "login" | "signup";

interface Props {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

export default function AuthCard({ tab, onTabChange, children }: Props) {
  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="flex border-b border-gray-700">
        <button
          type="button"
          onClick={() => onTabChange("login")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === "login"
              ? "text-orange-500 border-b-2 border-orange-500 bg-gray-800"
              : "text-gray-400 hover:text-gray-200 bg-gray-900/40"
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => onTabChange("signup")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === "signup"
              ? "text-orange-500 border-b-2 border-orange-500 bg-gray-800"
              : "text-gray-400 hover:text-gray-200 bg-gray-900/40"
          }`}
        >
          Sign Up
        </button>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}
