import { backendApiUrl } from "@/app/lib/backendUrl";

export interface ActionTypeOption {
  value: string;
  label: string;
}

let cached: ActionTypeOption[] | null = null;
let inflight: Promise<ActionTypeOption[]> | null = null;

export function prefetchActionTypes(): Promise<ActionTypeOption[]> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = fetch(backendApiUrl("videos/action-types"))
    .then(async (r) => {
      if (!r.ok) throw new Error("bad response");
      return r.json() as Promise<{ action_types: ActionTypeOption[] }>;
    })
    .then((d) => {
      cached = d.action_types ?? [];
      return cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function getCachedActionTypes(): ActionTypeOption[] | null {
  return cached;
}
