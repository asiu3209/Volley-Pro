"use client";

import Link from "next/link";

import { formatSkillDisplayName } from "@/app/lib/skillLabels";
import { resolveDisplayName } from "@/app/lib/profileInsights";
import { useProfilePage } from "@/app/profiles/hooks/useProfilePage";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
      <p className="text-2xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-400">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

function SkillBar({
  skill,
  avg,
  attempts,
}: {
  skill: string;
  avg: number;
  attempts: number;
}) {
  const pct = Math.min(100, Math.max(0, (avg / 10) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-gray-200">
          {formatSkillDisplayName(skill)}
        </span>
        <span className="tabular-nums text-orange-400">
          {avg.toFixed(1)}/10 · {attempts} {attempts === 1 ? "clip" : "clips"}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const {
    authUser,
    profile,
    userStats,
    recentVideos,
    skillStats,
    coaching,
    latestAnalysis,
    loading,
  } = useProfilePage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
          <p className="text-sm text-gray-400">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!profile || !authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1117] px-6 text-center text-white">
        <p className="text-lg font-medium">
          We couldn&apos;t load your profile.
        </p>
        <p className="max-w-md text-sm text-gray-400">
          Run a video analysis from the dashboard to create your profile
          automatically, then return here.
        </p>
        <Link
          href="/dashboard"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const displayName = resolveDisplayName(profile.full_name, authUser.name);
  const username = profile.username?.trim() || "player";
  const email = authUser.email;
  const skillLevel = profile.skill_level;
  const hasSkillLevel =
    skillLevel !== null && skillLevel !== undefined && skillLevel > 0;
  const skillPercent = hasSkillLevel ? (skillLevel / 10) * 100 : 0;

  const topSkill =
    skillStats.length > 0
      ? skillStats.reduce(
          (best, s) => (s.avg_score > best.avg_score ? s : best),
          skillStats[0],
        )
      : null;

  const recentSlice = recentVideos.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-gray-500 transition hover:text-white"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Profile &amp; settings
            </h1>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-5 py-8 pb-16">
        {/* Identity */}
        <section className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <div className="rounded-full bg-gradient-to-tr from-orange-500 via-amber-400 to-orange-600 p-[2px]">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f1117&color=f97316&size=128`}
                alt=""
                className="h-20 w-20 rounded-full border-2 border-[#0f1117] sm:h-24 sm:w-24"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h2>
            <p className="mt-1 truncate text-sm text-gray-500">{email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </div>
          </div>
        </section>

        {/* VolleyPro stats */}
        <section className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Your VolleyPro stats
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Videos analyzed"
              value={String(userStats.total_videos)}
            />
            <StatCard
              label="Average score"
              value={
                userStats.total_videos > 0
                  ? userStats.avg_score.toFixed(1)
                  : "—"
              }
              sub="Across all clips"
            />
            <StatCard
              label="Skills tracked"
              value={skillStats.length > 0 ? String(skillStats.length) : "—"}
              sub={
                topSkill
                  ? `Strongest: ${formatSkillDisplayName(topSkill.skill)}`
                  : undefined
              }
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Profile details */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Account details
            </h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500">Position</dt>
                <dd className="mt-0.5 font-medium text-gray-200">
                  {profile.position?.trim() || "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Profile skill level</dt>
                <dd className="mt-0.5 font-medium text-gray-200">
                  {hasSkillLevel ? `${skillLevel}/10` : "Not set"}
                </dd>
                {hasSkillLevel ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                      style={{ width: `${skillPercent}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <div>
                <dt className="text-gray-500">Member since</dt>
                <dd className="mt-0.5 font-medium text-gray-200">
                  {recentVideos.length > 0
                    ? new Date(
                        recentVideos[recentVideos.length - 1]!.created_at,
                      ).toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Skill breakdown */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Skill breakdown
            </h3>
            {skillStats.length === 0 ? (
              <p className="text-sm text-gray-500">
                Analyze a clip from the dashboard to see per-skill scores here.
              </p>
            ) : (
              <div className="space-y-4">
                {skillStats.map((s) => (
                  <SkillBar
                    key={s.skill}
                    skill={s.skill}
                    avg={s.avg_score}
                    attempts={s.attempts}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
