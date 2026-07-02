import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { requireProfile, AuthError, unauthorizedResponse, type UserProfile } from "@/lib/auth/current-user";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { checkDailyQuota } from "@/lib/admin/quotas";
import { buildVisionAnalysisPrompt, getMockAnalysis } from "@/lib/sfx/image-to-sound-prompt";
import type { ImageAnalysis, InterpretationMode, LayerRole, SonicStrategy, UseCase } from "@/lib/sfx/image-to-sound-taxonomy";
import { createServerLocalClient } from "@/lib/local/db-client";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { logger } from "@/lib/logger";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

const allowedMimeTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);
type AllowedImageMimeType = z.infer<typeof allowedMimeTypeSchema>;

const ALLOWED_IMAGE_MIME_TYPES = new Set<AllowedImageMimeType>(allowedMimeTypeSchema.options);

const interpretationModeSchema = z.enum([
  "literal",
  "cinematic",
  "game_ready",
  "cartoon",
  "experimental",
  "atmospheric",
  "foley_focused",
  "creature_focused",
  "ui_branding",
] as const satisfies readonly [InterpretationMode, ...InterpretationMode[]]);

const useCaseSchema = z.enum([
  "film",
  "game",
  "animation",
  "ui",
  "trailer",
  "social_video",
  "installation",
  "sound_art",
  "research",
] as const satisfies readonly [UseCase, ...UseCase[]]);

const sonicStrategySchema = z.enum([
  "single_sound",
  "layered_atmosphere",
  "foley_set",
  "ui_sound_set",
  "creature_set",
  "game_ambience",
  "scene_coverage",
  "prompt_pack",
  "sonic_moodboard",
] as const satisfies readonly [SonicStrategy, ...SonicStrategy[]]);

const layerRoleSchema = z.enum([
  "foreground",
  "midground",
  "background",
  "space",
  "texture",
  "emotion",
  "micro_events",
  "base_bed",
] as const satisfies readonly [LayerRole, ...LayerRole[]]);

const requestSchema = z.object({
  imageBase64: z.string().min(1),
  interpretationMode: interpretationModeSchema,
  useCase: useCaseSchema,
  mimeType: allowedMimeTypeSchema.optional(),
});

const shortString = (max: number) => z.string().trim().min(1).max(max);
const stringList = (maxItems: number, maxChars = 120) =>
  z.array(shortString(maxChars)).max(maxItems);

const visualElementSchema = z.object({
  element: shortString(160),
  sonicPotential: shortString(400),
  category: shortString(80),
});

const soundCardDraftSchema = z.object({
  title: shortString(120),
  category: shortString(80),
  layerRole: layerRoleSchema,
  visualSource: shortString(200),
  prompt: shortString(600),
  durationSeconds: z.coerce.number().int().min(1).max(30),
  loop: z.boolean(),
  promptInfluence: z.coerce.number().min(0).max(1),
  exclusions: stringList(12),
});

const imageAnalysisSchema = z.object({
  imageSummary: shortString(1000),
  visualElements: z.array(visualElementSchema).max(24),
  impliedActions: stringList(24),
  acousticSpace: shortString(500),
  materialTextures: stringList(24),
  mood: z.object({
    primary: shortString(80),
    secondary: stringList(12, 80),
  }),
  suggestedStrategy: sonicStrategySchema,
  foregroundSounds: stringList(24),
  backgroundSounds: stringList(24),
  ambienceLayers: stringList(24),
  foleyLayers: stringList(24),
  specialSounds: stringList(24),
  exclusions: stringList(24),
  soundCards: z.array(soundCardDraftSchema).min(1).max(12),
  missingInfoQuestions: stringList(12, 240),
}) satisfies z.ZodType<ImageAnalysis>;

function extractImagePayload(
  imageBase64: string,
  declaredMimeType?: AllowedImageMimeType
): { base64Data: string; mimeType: AllowedImageMimeType; imageBytes: number } | { error: string; status: number } {
  const match = imageBase64.match(/^data:([^;,]+);base64,([\s\S]*)$/);
  const dataUriMimeType = match?.[1]?.toLowerCase();
  const mimeType = dataUriMimeType ?? declaredMimeType ?? "image/jpeg";

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType as AllowedImageMimeType)) {
    return { error: "Unsupported image type. Use JPEG, PNG, or WebP.", status: 422 };
  }

  if (dataUriMimeType && declaredMimeType && dataUriMimeType !== declaredMimeType) {
    return { error: "Image data URI MIME type does not match the uploaded file type.", status: 422 };
  }

  const base64Data = (match ? match[2] : imageBase64).replace(/\s/g, "");
  if (!base64Data || base64Data.length % 4 === 1 || !BASE64_RE.test(base64Data)) {
    return { error: "Invalid base64 image payload.", status: 422 };
  }

  const imageBytes = Buffer.byteLength(base64Data, "base64");
  if (imageBytes > MAX_IMAGE_BYTES) {
    return { error: "Image is too large. Maximum upload size is 5 MB.", status: 413 };
  }

  return { base64Data, mimeType: mimeType as AllowedImageMimeType, imageBytes };
}

export async function POST(request: NextRequest) {
  let profile: UserProfile | undefined;

  try {
    try {
      profile = await requireProfile();
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse(err.message);
      throw err;
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_JSON_BYTES) {
      return NextResponse.json(
        { error: "Request body is too large. Maximum upload size is 5 MB." },
        { status: 413 }
      );
    }

    // Rate limiting (shared with generations for now)
    const userId = profile.id;
    const rl = await checkRateLimit(
      `analyze:${userId}`,
      RATE_LIMITS.generation.maxRequests,
      RATE_LIMITS.generation.windowMs
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } }
      );
    }

    // Daily quota enforcement (using generation quota logic to protect expensive LLM calls)
    const quota = await checkDailyQuota(userId, profile.plan);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          resetAtUtc: quota.resetAtUtc,
        },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 }
      );
    }

    const { imageBase64, interpretationMode, useCase, mimeType } = parsed.data;
    const imagePayload = extractImagePayload(imageBase64, mimeType);
    if ("error" in imagePayload) {
      return NextResponse.json({ error: imagePayload.error }, { status: imagePayload.status });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If no API key is provided, return mock data for testing
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Image analysis is not configured" },
          { status: 503 }
        );
      }
      logger.warn("No GEMINI_API_KEY found, returning mock analysis.");
      // Add a small artificial delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return NextResponse.json(getMockAnalysis());
    }

    // Initialize Gemini API
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildVisionAnalysisPrompt(interpretationMode, useCase);

    // Call Gemini 2.0 Flash
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imagePayload.base64Data,
                mimeType: imagePayload.mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini API");
    }

    // Parse the JSON response
    try {
      const rawAnalysis = JSON.parse(response.text);
      const parsedAnalysis = imageAnalysisSchema.safeParse(rawAnalysis);
      if (!parsedAnalysis.success) {
        logger.error({ issues: parsedAnalysis.error.issues }, "[image-to-sound] Gemini analysis failed schema validation");
        return NextResponse.json(
          { error: "Vision model returned an unexpected analysis format." },
          { status: 502 }
        );
      }

      const analysisData = parsedAnalysis.data;

      try {
        const database = await createServerLocalClient();
        const { data: sessionRow, error: sessionError } = await database
          .from("image_to_sound_sessions")
          .insert({
            user_id: userId,
            interpretation_mode: interpretationMode,
            use_case: useCase,
            image_summary: analysisData.imageSummary,
            visual_elements: analysisData.visualElements,
            mood: analysisData.mood,
            sonic_strategy: analysisData.suggestedStrategy,
            analysis: analysisData,
            status: "analyzed",
          })
          .select("id")
          .single();

        if (sessionError) {
          logger.error({ err: sessionError }, "Error saving image_to_sound_session");
        } else if (sessionRow) {
          const { error: cardsError } = await database.from("image_sound_cards").insert(
            analysisData.soundCards.map((card, index) => ({
              user_id: userId,
              session_id: sessionRow.id,
              title: card.title,
              visual_source: card.visualSource,
              category: card.category,
              layer_role: card.layerRole,
              prompt_text: card.prompt,
              duration_seconds: card.durationSeconds,
              loop: card.loop,
              prompt_influence: card.promptInfluence,
              exclusions: card.exclusions,
              status: "draft",
              sort_order: index,
            }))
          );
          if (cardsError) logger.error({ err: cardsError }, "Error saving image_sound_cards");
        }
      } catch (persistenceError) {
        logger.error({ err: persistenceError }, "Image-to-Sound persistence error");
      }

      await logUsageEvent({
        userId,
        apiRoute: "image_to_sound_analysis",
        modelId: "gemini-2.0-flash",
        appCreditCost: 0,
        metadata: {
          interpretationMode,
          useCase,
          mimeType: imagePayload.mimeType,
          imageBytes: imagePayload.imageBytes,
          soundCardCount: analysisData.soundCards.length,
        },
      });

      return NextResponse.json(analysisData);
    } catch (parseError) {
      logger.error({ err: parseError, responseText: response.text }, "[image-to-sound] failed to parse Gemini response as JSON");
      return NextResponse.json(
        { error: "Vision model returned invalid JSON format." },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Image-to-Sound analysis error");
    return NextResponse.json(
      { error: "Internal server error analyzing image" },
      { status: 500 }
    );
  }
}
