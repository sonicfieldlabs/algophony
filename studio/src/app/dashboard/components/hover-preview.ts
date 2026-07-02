/**
 * Algophony Studio — Hover Sound Preview Hook
 *
 * §5.8: On hover, play a 2-second preview at low volume after 400ms delay.
 * Only one preview plays at a time. ESC or mouseleave cancels.
 */

"use client";

import { useRef, useCallback, useEffect } from "react";

const HOVER_DELAY_MS = 400;
const PREVIEW_DURATION_MS = 2000;
const PREVIEW_VOLUME = 0.15;

let activeAudio: HTMLAudioElement | null = null;

function stopActive() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function useHoverPreview() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    stopActive();
  }, []);

  const startPreview = useCallback((url: string | null) => {
    cancel();
    if (!url) return;

    timerRef.current = setTimeout(() => {
      stopActive();

      const audio = new Audio(url);
      audio.volume = PREVIEW_VOLUME;
      audio.preload = "auto";

      audio.play().catch(() => {/* ignore autoplay block */});
      activeAudio = audio;

      // Stop after PREVIEW_DURATION_MS
      stopTimerRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        if (activeAudio === audio) activeAudio = null;
      }, PREVIEW_DURATION_MS);
    }, HOVER_DELAY_MS);
  }, [cancel]);

  // ESC key cancels
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      cancel();
    };
  }, [cancel]);

  return {
    /** Call on mouseenter with the audio URL */
    onHoverStart: startPreview,
    /** Call on mouseleave */
    onHoverEnd: cancel,
  };
}
