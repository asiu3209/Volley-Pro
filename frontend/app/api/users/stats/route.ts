import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../lib/verifyToken";

const BACKEND_URL = (process.env.INTERNAL_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const payload = verifyToken(req.headers.get("Authorization"));
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/users/stats?user_id=${encodeURIComponent(payload.userId)}`);
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.detail ?? "Failed to fetch stats" }, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
