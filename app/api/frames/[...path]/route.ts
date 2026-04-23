/**
 * GET /api/frames/[...path]
 *
 * Proxies any frame image from the backend through Next.js.
 * Handles flat paths like  /api/frames/preview_xxx.jpg
 * and nested paths like    /api/frames/analysis_video_xxx/frame_0.jpg
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const framePath = path.join("/"); // preserves subdirectory structure

  try {
    const response = await fetch(`${BACKEND_URL}/frames/${framePath}`);

    if (!response.ok) {
      return new NextResponse("Frame not found", { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch frame", { status: 502 });
  }
}
