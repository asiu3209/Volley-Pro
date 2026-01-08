import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const response = await fetch("http://localhost:8000/videos/presign", {
      method: "POST",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to presign video" },
        { status: 500 }
      );
    }
    return NextResponse.json(await response.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Presign request failed" },
      { status: 500 }
    );
  }
}
