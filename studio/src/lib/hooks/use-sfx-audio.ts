"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared single-track audio playback for SFX result lists.
 *
 * Plays one Audio element at a time, exposes the currently-playing key,
 * and pauses + tears down on unmount so audio doesn't keep playing after
 * the user navigates away.
 */
export function useSfxAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const play = useCallback((key: string, url: string | undefined) => {
    if (!url) return;
    // Toggle off if same item.
    if (playingKey === key) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingKey(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingKey(null);
      audioRef.current = null;
    };
    audio.onpause = () => {
      if (!audio.ended) setPlayingKey(null);
    };
    void audio.play();
    audioRef.current = audio;
    setPlayingKey(key);
  }, [playingKey]);

  // Cleanup on unmount — stop any audio still playing.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return { playingKey, play };
}
