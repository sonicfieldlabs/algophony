let activeMedia: HTMLMediaElement | null = null;
let originalPlay: typeof HTMLMediaElement.prototype.play | null = null;
let installCount = 0;

function pauseMedia(media: HTMLMediaElement) {
  if (!media.paused) {
    media.pause();
  }
}

function pauseDocumentMedia(except: HTMLMediaElement | null) {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => {
    if (media !== except) pauseMedia(media);
  });
}

function claimExclusiveMedia(media: HTMLMediaElement) {
  if (activeMedia && activeMedia !== media) {
    pauseMedia(activeMedia);
  }
  pauseDocumentMedia(media);
  activeMedia = media;
}

export function installExclusiveMediaPlayback() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof HTMLMediaElement === "undefined"
  ) {
    return () => {};
  }

  const mediaPrototype = HTMLMediaElement.prototype;

  if (installCount === 0) {
    originalPlay = mediaPrototype.play;
    mediaPrototype.play = function playExclusively() {
      claimExclusiveMedia(this);
      return originalPlay!.call(this);
    };
  }
  installCount += 1;

  const handleNativePlay = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLMediaElement) {
      claimExclusiveMedia(target);
    }
  };

  document.addEventListener("play", handleNativePlay, true);

  return () => {
    document.removeEventListener("play", handleNativePlay, true);
    installCount = Math.max(0, installCount - 1);

    if (installCount === 0 && originalPlay) {
      mediaPrototype.play = originalPlay;
      originalPlay = null;
      activeMedia = null;
    }
  };
}
