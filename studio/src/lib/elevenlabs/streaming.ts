/**
 * Algophony Studio — ElevenLabs Streaming Client
 *
 * §3.1: Stream audio as it generates via ReadableStream.
 * Returns a Response with streaming body for direct pipe to client.
 */

import "server-only";

import {
  ELEVENLABS_BASE,
  requireApiKey,
} from "./headers";

export interface StreamSfxOptions {
  text: string;
  model_id?: string;
  duration_seconds?: number | null;
  prompt_influence?: number;
  output_format?: string;
}

/**
 * Stream SFX generation — returns a ReadableStream of audio bytes.
 * The caller can pipe this directly to the HTTP response.
 *
 * @example
 * const stream = await streamSfxGeneration({ text: "thunder" });
 * return new Response(stream, { headers: { "Content-Type": "audio/mpeg" } });
 */
export async function streamSfxGeneration(
  opts: StreamSfxOptions
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; requestId: string | null }> {
  const apiKey = requireApiKey();

  const body: Record<string, unknown> = {
    text: opts.text,
    model_id: opts.model_id ?? "eleven_text_to_sound_v2",
    prompt_influence: opts.prompt_influence ?? 0.3,
  };
  if (opts.duration_seconds != null) body.duration_seconds = opts.duration_seconds;

  let url = `${ELEVENLABS_BASE}/v1/sound-generation`;
  if (opts.output_format) {
    url += `?output_format=${encodeURIComponent(opts.output_format)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Streaming error (${response.status})`;
    try {
      const errBody = await response.json();
      message = errBody?.detail?.message || errBody?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const requestId = response.headers.get("request-id");
  const contentType = response.headers.get("content-type") || "audio/mpeg";

  return { stream: response.body, contentType, requestId };
}

/**
 * Stream TTS generation — returns a ReadableStream of audio bytes.
 */
export async function streamTtsGeneration(opts: {
  text: string;
  voice_id: string;
  model_id?: string;
  output_format?: string;
}): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }> {
  const apiKey = requireApiKey();
  const voiceId = opts.voice_id;
  const modelId = opts.model_id ?? "eleven_multilingual_v2";

  let url = `${ELEVENLABS_BASE}/v1/text-to-speech/${voiceId}/stream`;
  if (opts.output_format) {
    url += `?output_format=${encodeURIComponent(opts.output_format)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: modelId,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`TTS streaming error (${response.status})`);
  }

  return {
    stream: response.body,
    contentType: response.headers.get("content-type") || "audio/mpeg",
  };
}
