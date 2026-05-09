"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { backendApiUrl, backendAssetUrl } from "../lib/backendUrl";

export interface ActionTypeOption {
  value: string;
  label: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PREVIEW_MAX_WIDTH = 640;
const PREVIEW_MAX_HEIGHT = 420;

interface Props {
  previewFramePath: string;
  onConfirm: (bbox: Rect, actionType: string) => void;
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
  const [actionOptions, setActionOptions] = useState<ActionTypeOption[]>([]);
  const [actionType, setActionType] = useState("");
  const [actionsError, setActionsError] = useState<string | null>(null);

  useEffect(() => {
    fetch(backendApiUrl("videos/action-types"))
      .then(async (r) => {
        if (!r.ok) throw new Error("bad response");
        return r.json() as Promise<{ action_types: ActionTypeOption[] }>;
      })
      .then((d) => {
        const opts = d.action_types ?? [];
        setActionOptions(opts);
        setActionType((prev) => prev || opts[0]?.value || "");
        setActionsError(null);
      })
      .catch(() =>
        setActionsError("Could not load action types. Is the API running?"),
      );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.src = backendAssetUrl(previewFramePath);
    img.onload = () => {
      imageRef.current = img;
      const scale = Math.min(
        1,
        PREVIEW_MAX_WIDTH / img.naturalWidth,
        PREVIEW_MAX_HEIGHT / img.naturalHeight,
      );
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

    ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

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

    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Target player", px + 4, Math.max(py - 6, 14));
  }, []);

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
    if (!imageRef.current) return;
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

  useEffect(() => {
    redraw(rect);
  }, [rect, redraw]);

  const handleConfirm = () => {
    if (!rect || rect.w < 0.01 || rect.h < 0.01 || !actionType || actionsError)
      return;
    setConfirmed(true);
    onConfirm(rect, actionType);
  };

  const canSubmit =
    !!rect &&
    rect.w >= 0.01 &&
    rect.h >= 0.01 &&
    !!actionType &&
    !actionsError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 p-6 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-white">
          Target player & action
        </h2>
        <p className="mb-4 text-sm text-neutral-400">
          This still is the <strong className="text-neutral-300">first frame</strong>{" "}
          of your clip. <strong className="text-neutral-300">Drag a box</strong>{" "}
          around the athlete to analyze — the server sends this image{" "}
          <em>with the box drawn</em> to Gemini together with your full video so the
          model knows exactly which player you mean.
        </p>

        <div className="mb-4">
          <label
            htmlFor="volley-action"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            Action type
          </label>
          <select
            id="volley-action"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            disabled={!!actionsError || actionOptions.length === 0}
            className="w-full rounded-lg border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {actionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {actionsError && (
            <p className="mt-2 text-xs text-red-400">{actionsError}</p>
          )}
        </div>

        <div className="flex justify-center overflow-hidden rounded-lg border border-neutral-700 bg-black">
          <canvas
            ref={canvasRef}
            className="max-h-[420px] max-w-full cursor-crosshair select-none"
            style={{ display: "block", height: "auto" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </div>

        {rect && (
          <p className="mt-2 text-xs text-green-400">
            Box selected ({Math.round(rect.w * 100)}% ×{" "}
            {Math.round(rect.h * 100)}% of preview). Drag again to redraw.
          </p>
        )}
        {!rect && (
          <p className="mt-2 text-xs text-neutral-500">
            Drag on the preview to draw a box around the player.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || confirmed}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {confirmed ? "Analysing…" : "Analyse video"}
          </button>
        </div>
      </div>
    </div>
  );
}
