/**
 * Algophony Studio — ElevenLabs TTS Client
 *
 * Server-only. Wraps the TTS with-timestamps endpoint using shared retry logic.
 * Extracted from tts-with-timing/route.ts per §1.12.
 */

import "server-only";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  mapElevenLabsErrorType,
  parseErrorBody,
} from "./headers";

export interface TtsWithTimingInput {
  text: string;
  voice_id: string;
  model_id: string;
  output_format: string;
  language_code?: string;
  seed?: number;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
    use_speaker_boost?: boolean;
  };
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  characters: Array<{ character: string; start: number; end: number }>;
}

export interface TtsTimingResult {
  success: true;
  timing: {
    words: WordTiming[];
    totalDuration: number;
    text: string;
  };
  audioBase64: string | null;
}

export interface TtsTimingError {
  success: false;
  statusCode: number;
  errorType: string;
  message: string;
}

/**
 * Call ElevenLabs TTS with-timestamps endpoint.
 * Returns word- and character-level timing alignment.
 */
export async function generateTtsWithTiming(
  input: TtsWithTimingInput
): Promise<TtsTimingResult | TtsTimingError> {
  // Mock mode
  if (process.env.MOCK_ELEVENLABS === "true") {
    return generateMockTiming(input);
  }

  let apiKey: string;
  try {
    apiKey = requireApiKey();
  } catch {
    return {
      success: false,
      statusCode: 500,
      errorType: "configuration",
      message: "ELEVENLABS_API_KEY is not configured",
    };
  }

  const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${encodeURIComponent(input.voice_id)}/with-timestamps?output_format=${encodeURIComponent(input.output_format)}`;

  const body: Record<string, unknown> = {
    text: input.text,
    model_id: input.model_id,
  };
  if (input.language_code) body.language_code = input.language_code;
  if (input.seed != null) body.seed = input.seed;
  if (input.voice_settings) body.voice_settings = input.voice_settings;

  try {
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorType = mapElevenLabsErrorType(response.status);
      const message = await parseErrorBody(response);
      return {
        success: false,
        statusCode: response.status,
        errorType,
        message,
      };
    }

    const data = await response.json();
    const alignment = data.alignment;
    if (!alignment) {
      return {
        success: false,
        statusCode: 500,
        errorType: "server",
        message: "No alignment data returned",
      };
    }

    // Build word-level timing from character data
    const chars: Array<{ char: string; start: number; end: number }> = [];
    for (let i = 0; i < alignment.characters.length; i++) {
      chars.push({
        char: alignment.characters[i],
        start: alignment.character_start_times_seconds[i],
        end: alignment.character_end_times_seconds[i],
      });
    }

    // Group characters into words
    const words: WordTiming[] = [];
    let currentWord = "";
    let wordStart = 0;
    let wordChars: Array<{ character: string; start: number; end: number }> = [];

    for (const c of chars) {
      if (c.char === " " || c.char === "\n" || c.char === "\t") {
        if (currentWord) {
          words.push({
            word: currentWord,
            start: wordStart,
            end: wordChars[wordChars.length - 1]?.end ?? wordStart,
            characters: [...wordChars],
          });
          currentWord = "";
          wordChars = [];
        }
      } else {
        if (!currentWord) wordStart = c.start;
        currentWord += c.char;
        wordChars.push({ character: c.char, start: c.start, end: c.end });
      }
    }
    if (currentWord) {
      words.push({
        word: currentWord,
        start: wordStart,
        end: wordChars[wordChars.length - 1]?.end ?? wordStart,
        characters: [...wordChars],
      });
    }

    const totalDuration = chars.length > 0 ? chars[chars.length - 1].end : 0;

    return {
      success: true,
      timing: { words, totalDuration, text: input.text },
      audioBase64: data.audio_base64 ?? null,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      errorType: "network",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

/** Generate mock timing data for dev/test */
function generateMockTiming(input: TtsWithTimingInput): TtsTimingResult {
  const wordTexts = input.text.split(/\s+/);
  let cursor = 0;
  const mockWords: WordTiming[] = wordTexts.map((word) => {
    const start = cursor;
    const duration = 0.1 + word.length * 0.06;
    const end = start + duration;
    cursor = end + 0.05;
    return {
      word,
      start: +start.toFixed(3),
      end: +end.toFixed(3),
      characters: [...word].map((char, ci) => ({
        character: char,
        start: +(start + ci * (duration / word.length)).toFixed(3),
        end: +(start + (ci + 1) * (duration / word.length)).toFixed(3),
      })),
    };
  });

  return {
    success: true,
    timing: { words: mockWords, totalDuration: +cursor.toFixed(3), text: input.text },
    audioBase64: null,
  };
}
