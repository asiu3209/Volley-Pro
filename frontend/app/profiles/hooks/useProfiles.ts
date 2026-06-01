"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/app/lib/auth";
import { useRouter } from "next/navigation";

export type Profile = {
  id: string;
  name: string;
  position?: string;
  team?: string;
};

export function useProfiles() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    setUser(storedUser);

    async function loadProfiles() {
      try {
        const res = await fetch("/api/profiles", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = (await res.json()) as {
            profile?: Profile | null;
          };
          const row = data.profile;
          setProfiles(row ? [row] : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadProfiles();
  }, [router]);

  return {
    user,
    profiles,
    loading,
  };
}