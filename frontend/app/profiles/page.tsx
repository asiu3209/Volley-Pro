"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. get auth user
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      const user = authData?.user;

      console.log("AUTH USER:", user);
      console.log("AUTH ERROR:", authError);

      if (!user) {
        setLoading(false);
        return;
      }

      // 2. get profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      console.log("PROFILE DATA:", data);
      console.log("PROFILE ERROR:", error);

      setProfile(data);
      setLoading(false);
    };

    load();
  }, []);

  // loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading profile...
      </div>
    );
  }

  // no profile found
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        No profile found for this user.
      </div>
    );
  }

  const skillPercent = (profile.skill_level / 10) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative">

      {/* glow background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.18),transparent)] pointer-events-none" />

      {/* HEADER */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-black/60 border-b border-white/10 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{profile.full_name}</h1>
            <p className="text-gray-400 text-sm">@{profile.username}</p>

            <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">
              ● Active Athlete
            </div>
          </div>

          <button className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:scale-105 transition">
            Edit Profile
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex justify-center px-6 py-10">
        <div className="w-full max-w-5xl">

          <div className="grid grid-cols-3 gap-8">

            {/* LEFT */}
            <div className="col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">

              <div className="flex flex-col items-center text-center">

                <div className="p-[3px] rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-pink-500">
                  <img
                    src={`https://ui-avatars.com/api/?name=${profile.full_name}`}
                    className="w-28 h-28 rounded-full border border-black"
                  />
                </div>

                <h2 className="text-xl font-bold mt-4">{profile.full_name}</h2>
                <p className="text-gray-400">@{profile.username}</p>

                <div className="mt-6 w-full space-y-3">

                  <div className="bg-black/40 p-3 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase">Position</p>
                    <p className="font-semibold">{profile.position}</p>
                  </div>

                  <div className="bg-black/40 p-3 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase">Skill Level</p>
                    <p className="font-semibold">{profile.skill_level}/10</p>

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

            {/* RIGHT */}
            <div className="col-span-2 space-y-8">

              <div className="grid grid-cols-3 gap-4">
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
                  This athlete shows strong offensive potential. Improving defensive transition speed will unlock elite-level performance.
                </p>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}