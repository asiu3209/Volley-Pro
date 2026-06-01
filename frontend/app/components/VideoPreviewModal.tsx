"use client";

import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface VideoPreviewModalProps {
  videoUrl: string;
  onContinue: () => void;
  onCancel: () => void;
}

export default function VideoPreviewModal({
  videoUrl,
  onContinue,
  onCancel,
}: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setVolume(v);
      setMuted(v === 0);
      if (videoRef.current) {
        videoRef.current.volume = v;
        videoRef.current.muted = v === 0;
      }
    },
    [],
  );

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const next = !muted;
    setMuted(next);
    videoRef.current.muted = next;
  }, [muted]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 p-6 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-white">
          Review your clip
        </h2>
        <p className="mb-4 text-sm text-neutral-400">
          Watch your video below. When you are ready, continue to select the
          player you want analyzed.
        </p>

        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg border border-neutral-700 bg-black"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full"
            style={{ maxHeight: "420px", display: "block" }}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
          />

          <div className="flex items-center gap-3 bg-neutral-950 px-3 py-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-neutral-400 hover:text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="h-1 w-24 cursor-pointer accent-indigo-500"
              aria-label="Volume"
            />

            <div className="flex-1" />

            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-neutral-400 hover:text-white"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

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
            onClick={onContinue}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
