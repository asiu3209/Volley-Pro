"use client";

import { useState } from "react";

interface UploadVideoProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

export default function UploadVideo({
  isOpen,
  onClose,
  onUpload,
}: UploadVideoProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const maxMb = Number.parseFloat(
    process.env.NEXT_PUBLIC_VOLLEY_MAX_UPLOAD_MB ?? "48",
  );
  const maxMbSafe = Number.isFinite(maxMb) && maxMb > 0 ? maxMb : 48;
  const maxBytes = maxMbSafe * 1024 * 1024;

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-xl">
        {/*Heading and Video Purpose */}
        <h2 className="text-xl font-semibold text-white">
          Upload A Short Volleyball Clip
        </h2>

        <p className="mt-2 text-sm text-neutral-400">
          Upload a short video for AI analysis and feedback. Maximum size about{" "}
          {maxMbSafe} MiB.
        </p>
        {/*Upload File */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            setSizeError(null);
            if (picked && picked.size > maxBytes) {
              setSizeError(
                `That file exceeds ${maxMbSafe} MiB. Choose a shorter or lower-resolution clip.`,
              );
              setFile(null);
              return;
            }
            setFile(picked);
          }}
          className="mt-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500"
        />
        {sizeError && (
          <p className="mt-2 text-xs text-amber-400">{sizeError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!file}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-500"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
