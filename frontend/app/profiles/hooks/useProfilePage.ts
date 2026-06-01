"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthUser } from "@/app/lib/auth";
import { getToken, getUser } from "@/app/lib/auth";
import { parseCoachingInsights } from "@/app/lib/profileInsights";
import { createClient } from "@/app/lib/supabase/client";
import { deriveSkillStatsFromVideos } from "@/app/lib/recentAnalysesCache";
import type { SkillStat, UserStats, VideoEntry } from "@/app/types/dashboard";
import type { UserProfile } from "@/app/profiles/types";

const EMPTY_STATS: UserStats = { total_videos: 0, avg_score: 0 };

async function loadProfileRow(userId: string): Promise<UserProfile | null> {
  const token = getToken();
  if (token) {
    const res = await fetch("/api/profiles", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { profile: UserProfile | null };
      if (data.profile) return data.profile;
    }
  }

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) return data as UserProfile;
  }

  return null;
}

export function useProfilePage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(EMPTY_STATS);
  const [recentVideos, setRecentVideos] = useState<VideoEntry[]>([]);
  const [skillStats, setSkillStats] = useState<SkillStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    setAuthUser(storedUser);

    void (async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [profileRow, statsRes, videosRes] = await Promise.all([
          loadProfileRow(storedUser.id),
          fetch("/api/users/stats", { headers }),
          fetch("/api/users/videos", { headers }),
        ]);

        setProfile(profileRow);

        if (statsRes.ok) {
          setUserStats((await statsRes.json()) as UserStats);
        }

        if (videosRes.ok) {
          const v = (await videosRes.json()) as { videos: VideoEntry[] };
          const videos = v.videos ?? [];
          setRecentVideos(videos);
          setSkillStats(deriveSkillStatsFromVideos(videos));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const latestAnalysis = recentVideos.find(
    (v) => typeof v.gemini_feedback === "string" && v.gemini_feedback.trim(),
  );
  const coaching = parseCoachingInsights(latestAnalysis?.gemini_feedback);

  return {
    authUser,
    profile,
    userStats,
    recentVideos,
    skillStats,
    coaching,
    latestAnalysis,
    loading,
  };
}
