"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * A video that may be an adaptive stream (HLS, .m3u8, from the admin's video
 * library): the video comes in pieces of a few seconds and the player picks the
 * size the connection carries, changing it while playing (like YouTube). Safari
 * and iPhones play streams themselves; elsewhere hls.js is loaded, only then.
 * Plain MP4/WebM files play as before.
 *
 * Streams also don't offer the browser's "download" button. That only makes
 * copying harder: anything a browser can play, a determined person can save.
 */
export function isStreamUrl(url: string | null | undefined, provider?: string | null) {
  return provider === "HLS" || /\.m3u8(?:[?#]|$)/i.test(String(url ?? ""));
}

type Props = {
  src: string;
  poster?: string | null;
  provider?: string | null;
  className?: string;
  style?: CSSProperties;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
};

export function StreamVideo({ src, poster, provider, className, style, controls = true, autoPlay, muted, loop }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const stream = isStreamUrl(src, provider);

  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    // Safari, iOS and some Android browsers play HLS themselves.
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = src;
      return;
    }
    let stopped = false;
    let player: { destroy: () => void } | null = null;
    import("hls.js")
      .then(({ default: Hls }) => {
        if (stopped) return;
        if (!Hls.isSupported()) {
          el.src = src; // try anyway
          return;
        }
        const hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1 });
        hls.loadSource(src);
        hls.attachMedia(el);
        player = hls;
      })
      .catch(() => {
        if (!stopped) el.src = src;
      });
    return () => {
      stopped = true;
      player?.destroy();
    };
  }, [src, stream]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={stream ? undefined : src}
      poster={poster ?? undefined}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
      data-stream={stream ? "hls" : undefined}
      controlsList={stream ? "nodownload" : undefined}
      onContextMenu={stream ? (e) => e.preventDefault() : undefined}
    />
  );
}
