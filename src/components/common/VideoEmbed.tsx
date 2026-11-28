import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Video, ExternalLink, Play } from "lucide-react";

export interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

export interface VideoEmbedHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  mute: () => void;
  unmute: () => void;
}

export function parseVideoUrl(url: string): {
  type: "youtube" | "vimeo" | "direct" | "unknown";
  embedUrl?: string;
  originalUrl: string;
} {
  if (!url || typeof url !== "string") {
    return { type: "unknown", originalUrl: url || "" };
  }
  const cleanUrl = url.trim();

  // 1. YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = cleanUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&enablejsapi=1&playsinline=1&autoplay=1&mute=1`,
      originalUrl: cleanUrl,
    };
  }

  // 2. Vimeo: vimeo.com/ID
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?api=1&autoplay=1&muted=1&playsinline=1`,
      originalUrl: cleanUrl,
    };
  }

  // 3. Direct video file (.mp4, .webm, .ogg, .mov)
  const pathWithoutQuery = cleanUrl.split("?")[0].split("#")[0].toLowerCase();
  if (
    pathWithoutQuery.endsWith(".mp4") ||
    pathWithoutQuery.endsWith(".webm") ||
    pathWithoutQuery.endsWith(".ogg") ||
    pathWithoutQuery.endsWith(".mov")
  ) {
    return {
      type: "direct",
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
    };
  }

  return { type: "unknown", originalUrl: cleanUrl };
}

export const VideoEmbed = forwardRef<VideoEmbedHandle, VideoEmbedProps>(({
  url,
  title = "Video content",
  className = "",
  autoplay = false,
  muted = true,
  controls = true,
  onPlayStateChange,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const postIframeCommand = (command: "playVideo" | "pauseVideo" | "mute" | "unMute" | "stopVideo") => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "*");
  };

  useImperativeHandle(ref, () => ({
    play: () => {
      if (videoRef.current) {
        void videoRef.current.play().then(() => onPlayStateChange?.(true)).catch(() => onPlayStateChange?.(false));
      } else {
        postIframeCommand("playVideo");
        onPlayStateChange?.(true);
      }
    },
    pause: () => {
      if (videoRef.current) videoRef.current.pause();
      else postIframeCommand("pauseVideo");
      onPlayStateChange?.(false);
    },
    stop: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } else {
        postIframeCommand("stopVideo");
      }
      onPlayStateChange?.(false);
    },
    mute: () => {
      if (videoRef.current) videoRef.current.muted = true;
      else postIframeCommand("mute");
    },
    unmute: () => {
      if (videoRef.current) videoRef.current.muted = false;
      else postIframeCommand("unMute");
    },
  }));

  if (!url) return null;
  const parsed = parseVideoUrl(url);

  if (parsed.type === "youtube" || parsed.type === "vimeo") {
    const separator = parsed.embedUrl?.includes("?") ? "&" : "?";
    const embedUrl = `${parsed.embedUrl}${separator}${autoplay ? "autoplay=1" : "autoplay=0"}${muted ? "&mute=1&muted=1" : ""}`;

    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-slate-200">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="flex justify-end">
          <a href={parsed.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1E3A5F] transition-colors">
            <ExternalLink className="h-3 w-3" /> Watch on external source
          </a>
        </div>
      </div>
    );
  }

  if (parsed.type === "direct") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-slate-200">
          <video
            ref={videoRef}
            src={parsed.originalUrl}
            controls={controls}
            autoPlay={autoplay}
            muted={muted}
            playsInline
            preload="metadata"
            onPlay={() => onPlayStateChange?.(true)}
            onPause={() => onPlayStateChange?.(false)}
            onError={() => onPlayStateChange?.(false)}
            className="w-full h-full object-contain"
          >
            Your browser does not support HTML5 video playback.
          </video>
        </div>
        <div className="flex justify-end">
          <a href={parsed.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1E3A5F] transition-colors">
            <ExternalLink className="h-3 w-3" /> Open video directly
          </a>
        </div>
      </div>
    );
  }

  // Fallback for custom or unrecognized URLs
  return (
    <div className={`p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1E3A5F] shrink-0">
          <Play className="h-4 w-4 fill-[#1E3A5F]" />
        </div>
        <div className="truncate">
          <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{url}</p>
        </div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A5F] hover:underline shrink-0">
        <ExternalLink className="h-3.5 w-3.5" /> Watch Video
      </a>
    </div>
  );
});

VideoEmbed.displayName = "VideoEmbed";

export default VideoEmbed;
