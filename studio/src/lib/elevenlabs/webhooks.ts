/**
 * Algophony Studio — ElevenLabs Webhooks Client
 *
 * Server-only. POST /v1/workspace/webhooks for async monitoring.
 */

import "server-only";

import { z } from "zod";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  mapElevenLabsErrorType,
  parseErrorBody,
  type ElevenLabsError,
} from "./headers";
import { createServiceLocalClient } from "@/lib/local/db-client";

export const webhookInputSchema = z.object({
  name: z.string().min(1, "Webhook name is required"),
  target_url: z.string().url("Must be a valid URL"),
});

export type WebhookInput = z.infer<typeof webhookInputSchema>;

export interface WebhookResult {
  success: true;
  webhookId: string;
  webhookSecret: string;
  isMock: boolean;
}

export async function registerWebhook(
  input: WebhookInput
): Promise<WebhookResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    const mock: WebhookResult = {
      success: true,
      webhookId: "mock-webhook-001",
      webhookSecret: "mock-secret-001",
      isMock: true,
    };
    await storeWebhook(mock.webhookId, input.name, input.target_url);
    return mock;
  }

  const apiKey = requireApiKey();

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/workspace/webhooks`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: input.name,
          target_url: input.target_url,
        }),
      }
    );

    if (!response.ok) {
      const message = await parseErrorBody(response);
      return {
        success: false,
        statusCode: response.status,
        errorType: mapElevenLabsErrorType(response.status),
        message,
      };
    }

    const result = await response.json();
    const webhookId = result.webhook_id ?? "";
    const webhookSecret = result.webhook_secret ?? "";

    await storeWebhook(webhookId, input.name, input.target_url);

    return {
      success: true,
      webhookId,
      webhookSecret,
      isMock: false,
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

async function storeWebhook(
  webhookId: string,
  name: string,
  targetUrl: string
): Promise<void> {
  const database = createServiceLocalClient();
  await database.from("elevenlabs_workspace_webhooks").upsert(
    {
      webhook_id: webhookId,
      name,
      target_url: targetUrl,
      status: "created",
    },
    { onConflict: "webhook_id" }
  );
}
