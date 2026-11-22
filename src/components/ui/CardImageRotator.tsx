import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CardImageRotatorProps {
  images?: string[];
  fallbackImage?: string;
  alt: string;
  className?: string;
  intervalMs?: number;
  showControls?: boolean;
  children?: React.ReactNode;
}

export const CardImageRotator: React.FC<CardImageRotatorProps> = ({
  images = [],
  fallbackImage = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  alt,
  className = "relative h-48 w-full bg-slate-100 overflow-hidden shrink-0",
  intervalMs = 4500,
  showControls = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Deduplicate and filter non-empty valid image URLs
  const validImages = useMemo(() => {
    const set = new Set<string>();
    const list: string[] = [];

    images.forEach((img) => {
      if (img && typeof img === "string" && img.trim().length > 0) {
        const trimmed = img.trim();
        if (!set.has(trimmed)) {
          set.add(trimmed);
          list.push(trimmed);
        }
      }
    });

    return list.length > 0 ? list : [fallbackImage];
  }, [images, fallbackImage]);

  const isMultiImage = validImages.length > 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isDocVisible, setIsDocVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Viewport intersection observer to avoid timers for offscreen cards
  useEffect(() => {
    if (!isMultiImage) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry?.isIntersecting ?? false);
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isMultiImage]);

  // Page visibility listener
  useEffect(() => {
    if (!isMultiImage) return;
    const handleVis = () => {
      setIsDocVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, [isMultiImage]);

  // Autoplay interval
  useEffect(() => {
    if (
      !isMultiImage ||
      isHovered ||
      isInteracting ||
      !isInView ||
      !isDocVisible ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isMultiImage,
    isHovered,
    isInteracting,
    isInView,
    isDocVisible,
    prefersReducedMotion,
    validImages.length,
    intervalMs,
  ]);

  const pauseTemporarily = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 6000);
  }, []);

  const goToNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      pauseTemporarily();
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    },
    [pauseTemporarily, validImages.length]
  );

  const goToPrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      pauseTemporarily();
      setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    },
    [pauseTemporarily, validImages.length]
  );

  const goToSlide = useCallback(
    (idx: number, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      pauseTemporarily();
      setCurrentIndex(idx);
    },
    [pauseTemporarily]
  );

  // If single image, render static image directly
  if (!isMultiImage) {
    return (
      <div ref={containerRef} className={className}>
        <img
          src={validImages[0]}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = fallbackImage;
          }}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`group/rotator ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsInteracting(true)}
      onTouchEnd={pauseTemporarily}
    >
      {/* Layered images with smooth opacity transition */}
      {validImages.map((src, idx) => {
        const isActive = idx === currentIndex;
        return (
          <img
            key={`${src}-${idx}`}
            src={src}
            alt={`${alt} - view ${idx + 1}`}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
              isActive ? "opacity-100 z-1" : "opacity-0 pointer-events-none z-0"
            }`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = fallbackImage;
            }}
          />
        );
      })}

      {/* Manual Arrow Controls (Discreet, appear on hover/touch) */}
      {showControls && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white backdrop-blur-xs opacity-0 group-hover/rotator:opacity-100 focus:opacity-100 transition-opacity duration-200 cursor-pointer shadow-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white backdrop-blur-xs opacity-0 group-hover/rotator:opacity-100 focus:opacity-100 transition-opacity duration-200 cursor-pointer shadow-xs"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Discreet Pagination Dots at bottom */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/50 backdrop-blur-xs"
            onClick={(e) => e.stopPropagation()}
            aria-label="Image gallery dots"
          >
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => goToSlide(idx, e)}
                aria-label={`Show image ${idx + 1} of ${validImages.length}`}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? "w-3.5 h-1.5 bg-amber-400"
                    : "w-1.5 h-1.5 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Overlay badges and pins */}
      {children}
    </div>
  );
};

export default CardImageRotator;
