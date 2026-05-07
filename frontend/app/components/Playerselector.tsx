"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { backendAssetUrl } from "../lib/backendUrl";

interface Rect {
  x: number; // fraction of image width  (0–1)
  y: number;
  w: number;
  h: number;
}

interface Props {
  previewFramePath: string; // path returned by /upload, e.g. "frames/preview_xxx.jpg"
  onConfirm: (bbox: Rect) => void;
  onCancel: () => void;
}

export default function PlayerSelector({
  previewFramePath,
  onConfirm,
  onCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });

  const [rect, setRect] = useState<Rect | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Load the preview image and draw it onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.src = backendAssetUrl(previewFramePath);
    img.onload = () => {
      imageRef.current = img;

      // Fit inside 700 px wide while preserving aspect ratio
      const maxW = 700;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, [previewFramePath]);

  const redraw = useCallback((r: Rect | null) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (!r) return;

    const px = r.x * canvas.width;
    const py = r.y * canvas.height;
    const pw = r.w * canvas.width;
    const ph = r.h * canvas.height;

    // Semi-transparent fill
    ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
    ctx.fillRect(px, py, pw, ph);

    // Bright border
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Corner handles
    const hs = 8;
    ctx.fillStyle = "#00ff00";
    [
      [px, py],
      [px + pw, py],
      [px, py + ph],
      [px + pw, py + ph],
    ].forEach(([cx, cy]) => {
      ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
    });

    // Label
    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Player", px + 4, Math.max(py - 6, 14));
  }, []);

  // Convert a MouseEvent to canvas-relative fractional coords
  const toFrac = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    return {
      x: Math.max(
        0,
        Math.min(1, ((e.clientX - bounds.left) * scaleX) / canvas.width),
      ),
      y: Math.max(
        0,
        Math.min(1, ((e.clientY - bounds.top) * scaleY) / canvas.height),
      ),
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = toFrac(e);
    dragging.current = true;
    startPt.current = pt;
    setRect(null);
    setConfirmed(false);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const pt = toFrac(e);
    const r: Rect = {
      x: Math.min(startPt.current.x, pt.x),
      y: Math.min(startPt.current.y, pt.y),
      w: Math.abs(pt.x - startPt.current.x),
      h: Math.abs(pt.y - startPt.current.y),
    };
    setRect(r);
    redraw(r);
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  // Keep canvas in sync with rect state
  useEffect(() => {
    redraw(rect);
  }, [rect, redraw]);

  const handleConfirm = () => {
    if (!rect || rect.w < 0.01 || rect.h < 0.01) return;
    setConfirmed(true);
    onConfirm(rect);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-1">
          Select the player to track
        </h2>
        <p className="text-sm text-neutral-400 mb-4">
          Click and drag a box around the player you want to analyse. The
          tracker will follow them through the video.
        </p>

        {/* Canvas */}
        <div className="overflow-hidden rounded-lg border border-neutral-700">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair select-none"
            style={{ display: "block" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </div>

        {rect && (
          <p className="mt-2 text-xs text-green-400">
            Box selected — {Math.round(rect.w * 100)}% ×{" "}
            {Math.round(rect.h * 100)}% of frame. Redraw to adjust.
          </p>
        )}
        {!rect && (
          <p className="mt-2 text-xs text-neutral-500">No box drawn yet.</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!rect || rect.w < 0.01 || rect.h < 0.01 || confirmed}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white
                       disabled:opacity-40 hover:bg-indigo-500"
          >
            {confirmed ? "Analysing…" : "Analyse this player"}
          </button>
        </div>
      </div>
    </div>
  );
}
