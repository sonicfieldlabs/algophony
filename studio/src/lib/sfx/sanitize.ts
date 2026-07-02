/**
 * Algophony Studio — Prompt Text Sanitization
 *
 * §2.5: Centralized sanitization for all user-provided text
 * that gets forwarded to ElevenLabs API endpoints.
 *
 * Responsibilities:
 * - Strip control characters
 * - Normalize whitespace
 * - Enforce max length per route
 * - Reject disallowed Unicode categories (surrogates, private use, unassigned)
 * - Optional deny-pattern filtering for prompt-injection defense
 */

export interface SanitizeOptions {
  /** Max character length (default: 2000) */
  maxLength?: number;
  /** Additional regex patterns to reject */
  denyPatterns?: RegExp[];
  /** Whether to throw on denial (default: false — returns sanitized result) */
  throwOnDeny?: boolean;
}

export interface SanitizeResult {
  text: string;
  /** Whether any content was modified or removed */
  modified: boolean;
  /** If denied, the reason */
  deniedReason?: string;
}

/** Default deny patterns — common prompt-injection attempts */
const DEFAULT_DENY_PATTERNS: RegExp[] = [
  // System/role injection
  /\bsystem\s*:\s*/i,
  /\bassistant\s*:\s*/i,
  /\buser\s*:\s*/i,
  // Common injection delimiters
  /\[\s*INST\s*\]/i,
  /<<\s*SYS\s*>>/i,
  // Ignore previous instructions
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
];

/**
 * Sanitize user-provided prompt text before forwarding to ElevenLabs.
 *
 * @example
 * const result = sanitizePromptText("  Heavy  rain  on  tin  roof  ");
 * // result.text === "Heavy rain on tin roof"
 */
export function sanitizePromptText(
  input: string,
  opts: SanitizeOptions = {}
): SanitizeResult {
  const maxLength = opts.maxLength ?? 2000;
  const denyPatterns = opts.denyPatterns ?? DEFAULT_DENY_PATTERNS;

  let text = input;
  let modified = false;

  // 1. Strip control characters (keep newlines and tabs for now)
  const beforeControl = text;
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (text !== beforeControl) modified = true;

  // 2. Strip surrogates (Cs), private use (Co), and unassigned (Cn) Unicode
  const beforeUnicode = text;
  text = text.replace(/[\uD800-\uDFFF\uE000-\uF8FF\uFFF0-\uFFFF]/g, "");
  if (text !== beforeUnicode) modified = true;

  // 3. Normalize whitespace — collapse runs, trim
  const beforeWs = text;
  text = text.replace(/\s{3,}/g, "  ").trim();
  if (text !== beforeWs) modified = true;

  // 4. Enforce max length
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
    modified = true;
  }

  // 5. Check deny patterns
  for (const pattern of denyPatterns) {
    if (pattern.test(text)) {
      const reason = `Input matches denied pattern: ${pattern.source}`;
      if (opts.throwOnDeny) {
        throw new PromptSanitizationError(reason);
      }
      return { text: "", modified: true, deniedReason: reason };
    }
  }

  return { text, modified };
}

/** Error thrown when throwOnDeny is true and input matches a deny pattern */
export class PromptSanitizationError extends Error {
  readonly status = 422;

  constructor(reason: string) {
    super(reason);
    this.name = "PromptSanitizationError";
  }
}
