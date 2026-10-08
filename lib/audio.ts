// 音檔相關的小工具

export const AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export function mimeFromPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "mp3";
  return AUDIO_MIME[ext] ?? "audio/mpeg";
}

// 舊紀錄沒有存 storage_path，從 audio_url 反推
export function storagePathFromUrl(audioUrl: string | null | undefined) {
  if (!audioUrl) return null;
  try {
    const url = new URL(audioUrl);
    const marker = "/object/public/recordings/";
    const idx = url.pathname.indexOf(marker);
    return idx === -1 ? null : decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !isFinite(seconds)) return "—";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function parseTimestamp(t: string | null | undefined) {
  if (!t) return null;
  const parts = String(t).trim().split(":").map(Number);
  if (parts.some((n) => isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
