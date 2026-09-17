/**
 * Grab the first frame of a local video File as a JPEG data URL for immediate UI.
 * Avoids waiting on full upload + remote preview before player selection.
 */
export function extractVideoFirstFrame(
  file: File,
  maxEdge = 960,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(msg));
    };

    const capture = () => {
      if (settled) return;
      try {
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (!vw || !vh) {
          fail("Video has no displayable frame.");
          return;
        }
        settled = true;
        const scale = Math.min(1, maxEdge / Math.max(vw, vh));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(vw * scale));
        canvas.height = Math.max(1, Math.round(vh * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas unavailable."));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        cleanup();
        resolve(dataUrl);
      } catch (e) {
        settled = true;
        cleanup();
        reject(e instanceof Error ? e : new Error("Failed to extract frame."));
      }
    };

    video.onerror = () => fail("Could not read video for preview.");

    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.05, (video.duration || 1) * 0.001);
      } catch {
        capture();
      }
    };

    video.onseeked = () => capture();

    // Fallback if seeked never fires (some codecs).
    window.setTimeout(() => {
      if (!settled && video.readyState >= 2) capture();
      else if (!settled) fail("Timed out reading video preview.");
    }, 4000);
  });
}
