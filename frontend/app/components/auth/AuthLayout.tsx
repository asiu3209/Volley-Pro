import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-white text-4xl font-semibold tracking-tight">
            VolleyPro
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Track, analyze, and improve your volleyball skills
          </p>
        </div>
        {children}
        <p className="text-center text-xs text-gray-600 mt-6">
          © 2026 VolleyPro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
