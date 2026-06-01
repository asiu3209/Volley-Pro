"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getToken, getUser } from "@/app/lib/auth";

export type UserProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  position: string | null;
  skill_level: number | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/profiles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { profile: UserProfile | null };
          setProfile(data.profile);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0f1117] text-white px-6">
        <p>No profile found for this user.</p>
        <p className="text-gray-400 text-sm text-center max-w-md">
          Run a video analysis once — your profile is created automatically — or
          sign up again if you just created your account.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const skillLevel = profile.skill_level ?? 0;
  const skillPercent = (skillLevel / 10) * 100;
  const displayName = profile.full_name?.trim() || "Player";
  const username = profile.username?.trim() || "player";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1117] via-gray-950 to-black text-white relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.18),transparent)] pointer-events-none" />

      <div className="sticky top-0 z-20 backdrop-blur-md bg-black/60 border-b border-white/10 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-white mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-lg font-bold">{displayName}</h1>
            <p className="text-gray-400 text-sm">@{username}</p>
            <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">
              ● Active Athlete
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:scale-105 transition shrink-0"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="flex justify-center px-6 py-10">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="p-[3px] rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-pink-500">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`}
                    alt=""
                    className="w-28 h-28 rounded-full border border-black"
                  />
                </div>

                <h2 className="text-xl font-bold mt-4">{displayName}</h2>
                <p className="text-gray-400">@{username}</p>

                <div className="mt-6 w-full space-y-3">
                  <div className="bg-black/40 p-3 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase">Position</p>
                    <p className="font-semibold">
                      {profile.position?.trim() || "—"}
                    </p>
                  </div>

                  <div className="bg-black/40 p-3 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase">
                      Skill Level
                    </p>
                    <p className="font-semibold">{skillLevel}/10</p>
                    <div className="w-full h-2 bg-gray-700 rounded-full mt-2">
                      <div
                        className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        style={{ width: `${skillPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Matches", value: 24 },
                  { label: "Wins", value: 18 },
                  { label: "MVPs", value: 6 },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5"
                  >
                    <p className="text-gray-400 text-sm">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-xs text-gray-500 uppercase mb-2">
                  Performance
                </p>
                <div className="space-y-3 text-gray-300">
                  <p>🔥 Strong attacking presence at the net</p>
                  <p>📈 High vertical jump consistency</p>
                  <p>⚠️ Needs improvement in serve reception</p>
                  <p>🧠 Excellent court awareness</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-6">
                <p className="text-xs text-gray-300 uppercase mb-2">
                  AI Coach
                </p>
                <p className="text-gray-200">
                  This athlete shows strong offensive potential. Improving
                  defensive transition speed will unlock elite-level performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
