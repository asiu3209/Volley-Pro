import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Create new FormData for backend
    const backendFormData = new FormData();
    backendFormData.append(
      "file",
      new Blob([buffer], { type: file.type }),
      file.name,
    );

    const response = await fetch(`${BACKEND_URL}/videos/upload`, {
      method: "POST",
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
