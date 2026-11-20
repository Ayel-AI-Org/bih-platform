import React from "react";
import { Video, ExternalLink, Play } from "lucide-react";

export interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
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
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
      originalUrl: cleanUrl,
    };
  }

  // 2. Vimeo: vimeo.com/ID
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
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

export const VideoEmbed: React.FC<VideoEmbedProps> = ({
  url,
  title = "Video content",
  className = "",
}) => {
  if (!url) return null;
  const parsed = parseVideoUrl(url);

  if (parsed.type === "youtube" || parsed.type === "vimeo") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-slate-200">
          <iframe
            src={parsed.embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <div className="flex justify-end">
          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1E3A5F] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Watch on external source
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
            src={parsed.originalUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          >
            Your browser does not support HTML5 video playback.
          </video>
        </div>
        <div className="flex justify-end">
          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1E3A5F] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Open video directly
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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A5F] hover:underline shrink-0"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Watch Video
      </a>
    </div>
  );
};

export default VideoEmbed;
