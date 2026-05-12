import { NextRequest, NextResponse } from "next/server";

import { getInternalBackendUrl } from "@/app/lib/serverBackend";

function previewKeyFromPath(previewPath: string): string {
  return previewPath.split(/[/\\]/).pop() ?? previewPath;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const backend = getInternalBackendUrl();
    const backendFormData = new FormData();
    backendFormData.append("file", file, file.name);

    const response = await fetch(`${backend}/videos/upload`, {
      method: "POST",
      body: backendFormData,
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json(
        { error: (data.detail as string) ?? "Upload failed" },
        { status: response.status },
      );
    }

    const previewPath =
      typeof data.preview_frame === "string" ? data.preview_frame : "";
    const previewKey = previewKeyFromPath(previewPath);

    return NextResponse.json({
      upload: {
        videoId: data.video_id,
        videoFilename: data.video_filename,
        previewFrameKey: previewKey,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload request failed" },
      { status: 500 },
    );
  }
}
