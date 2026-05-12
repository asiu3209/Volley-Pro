import { NextResponse } from "next/server";

import { getInternalBackendUrl } from "@/app/lib/serverBackend";

export async function GET() {
  try {
    const backend = getInternalBackendUrl();
    const response = await fetch(`${backend}/videos/action-types`, {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      action_types?: { value: string; label: string }[];
    };
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load action types" },
        { status: response.status },
      );
    }
    const actionTypes = Array.isArray(data.action_types)
      ? data.action_types.map((o) => ({
          value: String(o.value ?? ""),
          label: String(o.label ?? o.value ?? ""),
        }))
      : [];
    return NextResponse.json({ actionTypes });
  } catch {
    return NextResponse.json(
      { error: "Action types request failed" },
      { status: 500 },
    );
  }
}
