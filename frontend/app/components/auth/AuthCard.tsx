import type { ReactNode } from "react";

type Tab = "login" | "signup";

interface Props {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

export default function AuthCard({ tab, onTabChange, children }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl shadow-lg overflow-hidden">
      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => onTabChange("login")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === "login"
              ? "text-white border-b-2 border-white bg-transparent"
              : "text-gray-500 hover:text-gray-300 bg-transparent"
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => onTabChange("signup")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === "signup"
              ? "text-white border-b-2 border-white bg-transparent"
              : "text-gray-500 hover:text-gray-300 bg-transparent"
          }`}
        >
          Sign Up
        </button>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}
