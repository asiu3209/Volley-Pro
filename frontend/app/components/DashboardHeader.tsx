"use client";

import UploadVideo from "@/app/components/UploadVideo/UploadVideo";

type Props = {
  title: string;
  uploadOpen: boolean;
  onCloseUpload: () => void;
  onOpenUpload: () => void;
  onUpload: (file: File) => void | Promise<void>;
};

export default function DashboardHeader({
  title,
  uploadOpen,
  onCloseUpload,
  onOpenUpload,
  onUpload,
}: Props) {
  return (
    <header className="bg-gray-900 shadow-sm p-6 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-100">{title}</h2>
          <p className="text-gray-300 mt-1">
            Track, analyze, and improve your volleyball skills
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
        >
          Submit Video
        </button>
        <UploadVideo
          isOpen={uploadOpen}
          onClose={onCloseUpload}
          onUpload={onUpload}
        />
      </div>
    </header>
  );
}
