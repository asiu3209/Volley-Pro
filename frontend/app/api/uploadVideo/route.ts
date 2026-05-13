import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../lib/verifyToken";

const BACKEND_URL = (
  process.env.INTERNAL_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const payload = verifyToken(req.headers.get("Authorization"));
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append("file", file, file.name);

    const response = await fetch(`${BACKEND_URL}/videos/upload`, {
      method: "POST",
      headers: { "X-User-Id": payload.userId },
      body: backendFormData,
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Upload failed" },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload request failed" },
      { status: 500 },
    );
  }
}
