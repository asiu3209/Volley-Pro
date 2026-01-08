import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); //Obtain video metadata
    const response = await fetch("http://localhost:8000/videos/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to save video" },
        { status: 500 }
      );
    }
    return NextResponse.json(await response.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }
}
