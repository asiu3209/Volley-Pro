import type { ReactNode } from "react";

import Navbar from "@/app/components/landing/Navbar";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0f1117] text-white">
      <Navbar active="login" />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              VolleyPro
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Track, analyze, and improve your volleyball skills
            </p>
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-gray-600">
            © 2026 VolleyPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
