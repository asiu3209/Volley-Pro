import type { ReactNode } from "react";

import Navbar from "@/app/components/landing/Navbar";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0f1117] text-white">
      <Navbar active="login" />
      <div className="flex flex-1 items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Your account
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Log in or create an account to analyze clips and save reports.
            </p>
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-gray-600">
            Prefer to look around first?{" "}
            <a href="/#features" className="text-gray-400 hover:text-white">
              See features
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
