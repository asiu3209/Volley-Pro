import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../lib/verifyToken";

const BACKEND_URL = (
  process.env.INTERNAL_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const payload = verifyToken(req.headers.get("Authorization"));
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const response = await fetch(`${BACKEND_URL}/videos/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": payload.userId,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Analysis failed" },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Analysis request failed" },
      { status: 500 },
    );
  }
}
