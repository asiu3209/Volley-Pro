"use client";

import { useProfiles } from "./hooks/useProfiles";

export default function ProfilesPage() {
  const { user, profiles, loading } = useProfiles();

  // if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold">Player Profiles</h1>

        {loading ? (
          <p className="mt-4">Loading...</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 mt-6">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="bg-gray-800 p-4 rounded-lg border border-gray-700"
              >
                <h2 className="font-bold">{p.name}</h2>
                <p className="text-sm text-gray-400">{p.position}</p>
                <p className="text-sm text-gray-400">{p.team}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}