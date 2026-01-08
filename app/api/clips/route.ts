import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/clips
 * Creates a clip (serve, spike, block, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch("http://localhost:8000/clips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: "Failed to create clip" },
        { status: 500 }
      );
    }

    return NextResponse.json(await backendRes.json());
  } catch {
    return NextResponse.json({ error: "Invalid clip data" }, { status: 400 });
  }
}
