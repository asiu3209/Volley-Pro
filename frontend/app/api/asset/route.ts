import { NextRequest, NextResponse } from "next/server";

import { getInternalBackendUrl } from "@/app/lib/serverBackend";

const KEY_RE = /^[a-zA-Z0-9_.-]+\.(jpe?g|png|webp)$/i;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
  }

  const backend = getInternalBackendUrl();
  const upstream = await fetch(`${backend}/frames/${encodeURIComponent(key)}`, {
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Asset not found" },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
