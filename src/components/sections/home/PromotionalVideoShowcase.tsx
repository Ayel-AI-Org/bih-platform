import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, X, ArrowRight, Video as VideoIcon, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { parseVideoUrl, VideoEmbed, type VideoEmbedHandle } from "@/components/common/VideoEmbed";
import { type HomepageShowcaseSettings } from "@/database/types";

const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&q=80";

export interface PromotionalVideoShowcaseProps {
  settings: HomepageShowcaseSettings;
}

export const PromotionalVideoShowcase = ({ settings }: PromotionalVideoShowcaseProps) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isClosedForSession, setIsClosedForSession] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const embedRef = useRef<VideoEmbedHandle>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const parsedVideo = parseVideoUrl(settings.videoUrl || "");
  const hasValidVideo = Boolean(settings.videoUrl && settings.videoUrl.trim().length > 0);

  // Derive thumbnail: explicit setting -> YouTube HD thumbnail fallback -> high-res stock fallback
  const resolvedThumbnail = (() => {
    if (settings.thumbnailUrl && settings.thumbnailUrl.trim().length > 0) {
      return settings.thumbnailUrl.trim();
    }
    if (parsedVideo.type === "youtube") {
      const ytMatch = settings.videoUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
      );
      if (ytMatch && ytMatch[1]) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
      }
    }
    return FALLBACK_THUMBNAIL;
  })();

  const title = settings.videoTitle || "Beyond awareness. Into impact.";
  const description =
    settings.videoDescription ||
    "Discover who we are, what we stand for, and the change we're working to create.";
  const ctaText = settings.ctaText?.trim();
  const ctaUrl = settings.ctaUrl?.trim();
  const hasCta = Boolean(ctaText && ctaUrl);

  const isExternalCta = hasCta && (ctaUrl!.startsWith("http://") || ctaUrl!.startsWith("https://"));

  // Start playback and handle mute state
  const startPlayback = useCallback(
    (allowMuted = true) => {
      if (isClosedForSession) return;
      setIsStarted(true);
      setIsMuted(allowMuted);
      window.requestAnimationFrame(() => embedRef.current?.play());
    },
    [isClosedForSession]
  );

  // Intersection observer to track section visibility
  useEffect(() => {
    if (!hasValidVideo || isClosedForSession) return;

    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          startPlayback(true);
        }

        if (entry.isIntersecting) {
          setIsFloating(false);
        } else if (isStarted) {
          setIsFloating(true);
        }
      },
      { threshold: [0, 0.35, 0.75, 1] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [isClosedForSession, isStarted, startPlayback, hasValidVideo]);

  // Handle Escape key to close video
  useEffect(() => {
    if (!isStarted) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        embedRef.current?.stop();
        setIsStarted(false);
        setIsFloating(false);
        setIsClosedForSession(true);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isStarted]);

  const closePlayer = () => {
    embedRef.current?.stop();
    setIsStarted(false);
    setIsFloating(false);
    setIsPlaying(false);
    setIsClosedForSession(true);
  };

  const togglePlayback = () => {
    if (!isStarted) {
      startPlayback(true);
      return;
    }
    if (isPlaying) embedRef.current?.pause();
    else embedRef.current?.play();
  };

  const toggleMute = () => {
    if (isMuted) embedRef.current?.unmute();
    else embedRef.current?.mute();
    setIsMuted((value) => !value);
  };

  const returnToSection = () => {
    sectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  };

  return (
    <section
      aria-label="Promotional Video Showcase"
      className="relative py-16 md:py-24 overflow-hidden bg-[#F7F5EF] text-[#24312B]"
      ref={sectionRef}
    >
      {/* A restrained top seam softens the hero-to-ivory transition. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#1E3A5F]/10 to-transparent pointer-events-none"
      />

      {/* Quiet sage accents keep the cream background connected to the brand palette */}
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-24 w-72 h-72 bg-[#E5EBDD]/55 rounded-full blur-3xl pointer-events-none"
      />

      <div className="container max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Text Content & Mission Framing */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            {/* Editorial Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#244B38] uppercase tracking-[0.16em]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
              <span>Our Story in Motion</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#244B38] tracking-tight leading-[1.15]">
              {title}
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#3F4642] font-sans leading-relaxed max-w-xl">
              {description}
            </p>

            {/* Interactive Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {hasValidVideo && (
                <Button
                  onClick={togglePlayback}
                  size="lg"
                  className="bg-[#D4A017] hover:bg-[#E5B228] text-slate-950 font-semibold px-6 shadow-lg shadow-[#244B38]/10 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2 h-12"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  {isPlaying ? "Pause Video" : "Watch Video"}
                </Button>
              )}
              {hasCta && (
                isExternalCta ? (
                  <Button asChild variant="outline" size="lg" className="border-[#244B38]/25 bg-white/35 hover:bg-[#E5EBDD] text-[#244B38] hover:text-[#244B38] font-medium px-6 h-12 transition-colors">
                    <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                      {ctaText}<ArrowRight className="w-4 h-4 ml-1.5 text-[#244B38]" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg" className="border-[#244B38]/25 bg-white/35 hover:bg-[#E5EBDD] text-[#244B38] hover:text-[#244B38] font-medium px-6 h-12 transition-colors">
                    <Link to={ctaUrl!}>{ctaText}<ArrowRight className="w-4 h-4 ml-1.5 text-[#244B38]" /></Link>
                  </Button>
                )
              )}
            </div>
          </motion.div>

          {/* Right Column: Cinematic Video Thumbnail & Play Trigger */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="lg:col-span-6"
          >
            <div
              onClick={() => !isStarted && hasValidVideo && startPlayback(true)}
              role={hasValidVideo && !isStarted ? "button" : undefined}
              tabIndex={hasValidVideo && !isStarted ? 0 : undefined}
              onKeyDown={(e) => {
                if (!isStarted && hasValidVideo && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  startPlayback(true);
                }
              }}
              aria-label={!isStarted && hasValidVideo ? `Play promotional video: ${title}` : undefined}
              className={isFloating
                ? "fixed z-[60] left-3 right-3 top-[calc(var(--navbar-height,72px)+env(safe-area-inset-top)+12px)] sm:left-auto sm:right-5 sm:top-auto sm:bottom-5 sm:w-[min(360px,calc(100vw-40px))] aspect-video rounded-2xl overflow-hidden border border-[#244B38]/30 bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.28)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                : "group relative aspect-video w-full rounded-2xl overflow-hidden border border-[#244B38]/20 shadow-[0_22px_55px_rgba(36,75,56,0.16)] bg-[#244B38]/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5EF]"
              }
            >
              {/* One player instance changes position; thumbnail remains only before playback. */}
              {isStarted ? (
                <>
                  <VideoEmbed
                    ref={embedRef}
                    url={settings.videoUrl}
                    title={title}
                    autoplay
                    muted={isMuted}
                    controls={false}
                    onPlayStateChange={setIsPlaying}
                    className="w-full h-full [&_.space-y-1\\.5]:space-y-0 [&_.flex.justify-end]:hidden [&_.relative.w-full.aspect-video]:h-full [&_.relative.w_full.aspect-video]:rounded-none [&_.relative.w-full.aspect-video]:border-0"
                  />
                  {isFloating && (
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-1 px-2 py-2 bg-gradient-to-t from-slate-950/95 to-transparent">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={togglePlayback} className="h-8 w-8 rounded-full text-white hover:bg-white/15" aria-label={isPlaying ? "Pause video" : "Play video"}>
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 rounded-full text-white hover:bg-white/15" aria-label={isMuted ? "Unmute video" : "Mute video"}>
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={returnToSection} className="h-8 w-8 rounded-full text-white hover:bg-white/15" aria-label="Return to video section">
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={closePlayer} className="h-8 w-8 rounded-full text-white hover:bg-red-500/25" aria-label="Close video player">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <img
                    src={resolvedThumbnail}
                    alt={title}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_THUMBNAIL; }}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/30 group-hover:via-black/25 transition-colors" />
                  <div aria-hidden="true" className="absolute inset-3 rounded-xl border border-white/10 pointer-events-none group-hover:border-white/20 transition-colors" />
                  {hasValidVideo ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <div aria-hidden="true" className="absolute -inset-2 rounded-full bg-[#D4A017]/30 blur-md group-hover:scale-125 group-hover:bg-[#D4A017]/40 transition-all duration-500 animate-pulse" />
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#D4A017] text-slate-950 flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-[#E5B228] group-active:scale-95">
                          <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-white/95 tracking-wide drop-shadow-md group-hover:text-white">Click to Play</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70"><VideoIcon className="w-6 h-6" /></div>
                      <p className="text-xs text-white/70 max-w-xs font-medium">Video coming soon. Check back shortly to watch our mission showcase.</p>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-white/75 pointer-events-none">
                    <span className="truncate max-w-[70%] font-medium drop-shadow-sm">Bridge for Impact Hub</span>
                    <span className="uppercase tracking-widest font-bold text-[#D4A017]">BIH Spotlight</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PromotionalVideoShowcase;
