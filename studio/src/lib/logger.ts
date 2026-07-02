/**
 * Algophony Studio — Structured Logger
 *
 * §2.4: Replaces console.* with structured JSON logging.
 * Uses pino in production and pino-pretty in development.
 * Includes request correlation via x-request-id and field redaction.
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/** Fields to redact from logs — prevents credential leakage */
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["xi-api-key"]',
  "headers.authorization",
  "headers.cookie",
  'headers["xi-api-key"]',
  "body.apiKey",
  "body.api_key",
  "apiKey",
  "api_key",
  "xi_api_key",
  "password",
  "secret",
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

/**
 * Create a child logger with request correlation ID.
 * Use in API routes: `const log = requestLogger(request.headers.get('x-request-id'))`
 */
export function requestLogger(requestId?: string | null) {
  return logger.child({ req_id: requestId ?? "unknown" });
}

export default logger;
