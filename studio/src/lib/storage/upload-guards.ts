/**
 * Algophony Studio — Upload Guards
 *
 * Centralizes file-upload safety checks (size, MIME, extension) so every
 * upload endpoint can fail fast and consistently before reading the body
 * into memory.
 */

export const MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_AUDIO_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
]);

const ALLOWED_AUDIO_EXT = new Set([
  "wav", "mp3", "m4a", "aac", "ogg", "flac", "webm", "mp4",
]);

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);

const ALLOWED_IMAGE_EXT = new Set([
  "jpg", "jpeg", "png", "webp", "gif",
]);

export type UploadGuardResult =
  | { ok: true; ext: string }
  | { ok: false; reason: string };

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function assertAcceptableUpload(
  file: File,
  kind: "audio" | "image" = "audio",
): UploadGuardResult {
  const maxBytes = kind === "audio" ? MAX_AUDIO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
  const allowedMime = kind === "audio" ? ALLOWED_AUDIO_MIME : ALLOWED_IMAGE_MIME;
  const allowedExt = kind === "audio" ? ALLOWED_AUDIO_EXT : ALLOWED_IMAGE_EXT;

  if (file.size > maxBytes) {
    return { ok: false, reason: `File too large. Max ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  }
  if (file.size === 0) {
    return { ok: false, reason: "File is empty." };
  }

  const mime = (file.type || "").toLowerCase();
  const ext = extOf(file.name);

  // We accept the file if either MIME or extension is in the allowlist — browsers
  // are inconsistent about MIME assignment for audio (sometimes "" for .wav). But
  // the extension MUST be in the allowlist to prevent disguised executables.
  if (!allowedExt.has(ext)) {
    return { ok: false, reason: `Unsupported file extension .${ext || "(none)"}` };
  }
  if (mime && !allowedMime.has(mime)) {
    return { ok: false, reason: `Unsupported content type ${mime}` };
  }

  return { ok: true, ext };
}
