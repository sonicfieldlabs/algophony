/**
 * Algophony Studio — AtlasMark logo
 *
 * Renders the Algophony Studio wave-eye logo. Two variants are loaded:
 *   - logo-dark.jpeg  → white mark on black bg  → shown in dark mode
 *   - logo-light.jpeg → black mark on white bg  → shown in light mode
 *
 * The component uses pure CSS `[data-theme]` selectors so the swap is
 * instant, SSR-friendly, and requires no React context.
 *
 * Both images are always in the DOM (one hidden), so switching themes
 * never triggers a network request.
 */

/* eslint-disable @next/next/no-img-element */

export interface AtlasMarkProps {
  className?: string;
  /** @deprecated — no longer used (images contain their own colours). */
  strokeColor?: string;
}

export function AtlasMark({ className }: AtlasMarkProps) {
  return (
    <>
      {/* Dark mode → show the white-on-black logo */}
      <img
        src="/logo-dark.jpeg"
        alt=""
        aria-hidden
        draggable={false}
        className={`atlas-mark-dark ${className ?? ""}`}
      />
      {/* Light mode → show the black-on-white logo */}
      <img
        src="/logo-light.jpeg"
        alt=""
        aria-hidden
        draggable={false}
        className={`atlas-mark-light ${className ?? ""}`}
      />
    </>
  );
}
