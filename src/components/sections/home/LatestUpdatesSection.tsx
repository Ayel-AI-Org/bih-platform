import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { getLatestUpdates } from "@/database/operations";
import { type MediaArticle } from "@/database/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardImageRotator } from "@/components/ui/CardImageRotator";
import { Calendar, Pin, ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80";

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case "announcement":
      return "bg-[#1E3A5F] text-white";
    case "event":
      return "bg-[#D4A017] text-white";
    case "media":
    default:
      return "bg-slate-700 text-white";
  }
};

export const LatestUpdatesSection = () => {
  const [items, setItems] = useState<MediaArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isDocVisible, setIsDocVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // IntersectionObserver to pause autoplay when carousel leaves viewport,
  // and resume in place when visible again without altering document scroll position
  useEffect(() => {
    if (loading) return;
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry ? entry.isIntersecting : false);
      },
      { threshold: 0.1 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [loading]);

  // Page visibility listener
  useEffect(() => {
    const handleVis = () => {
      setIsDocVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchUpdates = async () => {
      try {
        const data = await getLatestUpdates(10);
        if (isMounted) {
          setItems(data || []);
        }
      } catch (err) {
        console.error("Failed to load latest updates:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUpdates();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter drafts/archived, deduplicate by ID, and sort pinned-first
  const validItems = items.filter((item) => item && item.isPublished !== false);
  const seenIds = new Set<string>();
  const dedupedItems = validItems.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  const sortedItems = [...dedupedItems].sort((a, b) => {
    // 1. Pinned content first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // 2. Publication date descending
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dateB - dateA;
  });

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const cards = container.children;
    if (cards.length > 0) {
      let closestIdx = 0;
      let minDiff = Infinity;
      const containerLeft = container.getBoundingClientRect().left;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const diff = Math.abs(card.getBoundingClientRect().left - containerLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      setActiveIndex(closestIdx);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [sortedItems.length, updateScrollState]);

  const scrollToSlide = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetCard = container.children[index] as HTMLElement;
    if (!targetCard) return;

    // Calculate scroll offset strictly within the container.
    // NEVER call targetCard.scrollIntoView(), window.scrollTo(), or element.focus() -
    // those alter document scroll position and pull the browser window unexpectedly.
    const targetLeft =
      index === 0
        ? 0
        : Math.max(
            0,
            container.scrollLeft + (targetCard.getBoundingClientRect().left - container.getBoundingClientRect().left)
          );

    if (typeof container.scrollTo === "function") {
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
    } else {
      container.scrollLeft = targetLeft;
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = container.clientWidth * (window.innerWidth >= 768 ? 0.35 : 0.85);
    const targetLeft =
      direction === "left"
        ? Math.max(0, container.scrollLeft - cardWidth)
        : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + cardWidth);

    if (typeof container.scrollTo === "function") {
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
    } else {
      container.scrollLeft = targetLeft;
    }
  };

  const handleManualNavigate = useCallback((action: () => void) => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    action();
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 7500);
  }, []);

  // Autoplay effect - advances smoothly every 6.5s, loops to start, pauses on interaction/hover/out of view
  useEffect(() => {
    if (
      sortedItems.length <= 1 ||
      isHovered ||
      isFocused ||
      isInteracting ||
      !isInView ||
      !isDocVisible ||
      prefersReducedMotion
    ) {
      return;
    }

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % sortedItems.length;
        scrollToSlide(next);
        return next;
      });
    }, 6500);

    return () => clearInterval(interval);
  }, [
    sortedItems.length,
    isHovered,
    isFocused,
    isInteracting,
    isInView,
    isDocVisible,
    prefersReducedMotion,
    scrollToSlide,
  ]);

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="container max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-64 md:w-96" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="flex gap-5 overflow-hidden">
            <Skeleton className="h-72 w-[70%] rounded-2xl shrink-0" />
            <Skeleton className="h-72 w-[35%] rounded-2xl shrink-0" />
          </div>
        </div>
      </section>
    );
  }

  const featured = sortedItems[0];
  const subsequentCards = sortedItems.slice(1);

  return (
    <section
      ref={sectionRef}
      aria-label="Latest Updates and Announcements"
      className="py-12 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 overflow-hidden"
    >
      <div className="container max-w-6xl space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
              <p className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">
                Latest Updates
              </p>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif text-[#1E3A5F] font-bold tracking-tight">
              What's Happening Across Our Community
            </h2>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-300 text-[#1E3A5F] hover:bg-slate-100 hover:text-[#1E3A5F] text-xs font-semibold shadow-xs"
            >
              <Link to="/media" className="flex items-center gap-1.5">
                View all updates
                <ArrowRight className="h-3.5 w-3.5 text-[#D4A017]" />
              </Link>
            </Button>

            {/* Desktop Carousel Controls */}
            {sortedItems.length > 1 && (
              <div className="hidden md:flex items-center gap-1.5 ml-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleManualNavigate(() => scroll("left"))}
                  disabled={!canScrollLeft}
                  className="h-8 w-8 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                  aria-label="Previous updates"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleManualNavigate(() => scroll("right"))}
                  disabled={!canScrollRight}
                  className="h-8 w-8 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                  aria-label="Next updates"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Carousel Content */}
        {sortedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 md:p-12 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="text-slate-600 font-medium text-sm">
              No published updates or announcements yet. Check back soon for the latest community blueprints, events, and press releases.
            </p>
          </div>
        ) : sortedItems.length === 1 ? (
          /* Single Card Layout */
          <div className="w-full">
            <div className="group rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden grid md:grid-cols-12 min-h-[300px]">
              <CardImageRotator
                images={[featured.imageUrl, ...(featured.imageUrls || []), ...(featured.galleryUrls || [])]}
                fallbackImage={FALLBACK_IMAGE}
                alt={featured.title}
                className="relative md:col-span-5 h-56 md:h-full min-h-[240px] bg-slate-100 overflow-hidden shrink-0"
              >
                {featured.type === "event" && featured.eventDate && (
                  <div className="absolute top-3 left-3 bg-[#1E3A5F] text-white rounded-lg px-2.5 py-1.5 shadow-md flex flex-col items-center leading-none text-center border border-white/20 z-10">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A017]">
                      {new Date(featured.eventDate).toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span className="text-base font-bold font-serif mt-0.5">
                      {new Date(featured.eventDate).toLocaleDateString(undefined, { day: "numeric" })}
                    </span>
                  </div>
                )}
                {featured.isPinned && (
                  <div
                    className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5 shadow-md z-10"
                    title="Pinned Editorial Priority"
                  >
                    <Pin className="h-3.5 w-3.5 fill-white" />
                  </div>
                )}
              </CardImageRotator>

              <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(
                        featured.type
                      )}`}
                    >
                      {featured.type}
                    </Badge>
                    {featured.isPinned && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-50 text-amber-900 border-amber-300 font-medium flex items-center gap-1"
                      >
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        Featured
                      </Badge>
                    )}
                    {featured.category && (
                      <span className="text-xs text-slate-500 font-medium">• {featured.category}</span>
                    )}
                    {featured.publishedAt && (
                      <span className="text-xs text-slate-400">{formatDate(featured.publishedAt)}</span>
                    )}
                  </div>

                  <h3 className="text-xl md:text-2xl font-serif text-[#1E3A5F] font-bold leading-snug line-clamp-2">
                    <Link to={`/media?item=${featured.id}`} className="hover:underline focus:outline-hidden">
                      {featured.title}
                    </Link>
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{featured.summary}</p>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <Button
                    asChild
                    size="sm"
                    className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs gap-1.5 h-8 shadow-xs"
                  >
                    <Link to={`/media?item=${featured.id}`}>
                      {featured.type === "event" ? "View Event Details" : "Read Full Story"}
                      <ArrowRight className="h-3.5 w-3.5 text-[#D4A017]" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Multi-card Responsive Horizontal Carousel */
          <div className="space-y-4">
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-5 pb-4 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              aria-label="Updates carousel track"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onFocusCapture={() => setIsFocused(true)}
              onBlurCapture={() => setIsFocused(false)}
              onTouchStart={() => setIsInteracting(true)}
              onTouchEnd={() => {
                if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
                interactionTimeoutRef.current = setTimeout(() => setIsInteracting(false), 7500);
              }}
            >
              {/* Primary Card (Featured / First Pinned Item) */}
              <div className="w-[85%] md:w-[68%] min-w-[300px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col md:grid md:grid-cols-12 min-h-[300px]">
                <CardImageRotator
                  images={[featured.imageUrl, ...(featured.imageUrls || []), ...(featured.galleryUrls || [])]}
                  fallbackImage={FALLBACK_IMAGE}
                  alt={featured.title}
                  className="relative md:col-span-5 h-52 md:h-full min-h-[220px] bg-slate-100 overflow-hidden shrink-0"
                >
                  {featured.type === "event" && featured.eventDate && (
                    <div className="absolute top-3 left-3 bg-[#1E3A5F] text-white rounded-lg px-2.5 py-1.5 shadow-md flex flex-col items-center leading-none text-center border border-white/20 z-10">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A017]">
                        {new Date(featured.eventDate).toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-base font-bold font-serif mt-0.5">
                        {new Date(featured.eventDate).toLocaleDateString(undefined, { day: "numeric" })}
                      </span>
                    </div>
                  )}
                  {featured.isPinned && (
                    <div
                      className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5 shadow-md z-10"
                      title="Pinned Editorial Priority"
                    >
                      <Pin className="h-3.5 w-3.5 fill-white" />
                    </div>
                  )}
                </CardImageRotator>

                <div className="md:col-span-7 p-6 md:p-7 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(
                          featured.type
                        )}`}
                      >
                        {featured.type}
                      </Badge>
                      {featured.isPinned ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-50 text-amber-900 border-amber-300 font-medium flex items-center gap-1"
                        >
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          Featured
                        </Badge>
                      ) : null}
                      {featured.category && (
                        <span className="text-xs text-slate-500 font-medium">• {featured.category}</span>
                      )}
                      {featured.type === "event" && featured.eventDate ? (
                        <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#D4A017]" />
                          {formatDate(featured.eventDate)}
                        </span>
                      ) : featured.publishedAt ? (
                        <span className="text-xs text-slate-400">{formatDate(featured.publishedAt)}</span>
                      ) : null}
                    </div>

                    <h3 className="text-lg md:text-xl font-serif text-[#1E3A5F] font-bold leading-snug line-clamp-2">
                      <Link to={`/media?item=${featured.id}`} className="hover:underline focus:outline-hidden">
                        {featured.title}
                      </Link>
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed line-clamp-3">{featured.summary}</p>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                    <Button
                      asChild
                      size="sm"
                      className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs gap-1.5 h-8 shadow-xs"
                    >
                      <Link to={`/media?item=${featured.id}`}>
                        {featured.type === "event" ? "View Event Details" : "Read Full Story"}
                        <ArrowRight className="h-3.5 w-3.5 text-[#D4A017]" />
                      </Link>
                    </Button>
                    <span className="text-[11px] text-slate-400 font-medium">Card 1 of {sortedItems.length}</span>
                  </div>
                </div>
              </div>

              {/* Subsequent Standard Cards beside featured card */}
              {subsequentCards.map((item, idx) => (
                <div
                  key={item.id}
                  className="w-[82%] md:w-[32%] min-w-[280px] shrink-0 snap-start rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between min-h-[300px]"
                >
                  <div>
                    {/* Cover Thumbnail */}
                    <CardImageRotator
                      images={[item.imageUrl, ...(item.imageUrls || []), ...(item.galleryUrls || [])]}
                      fallbackImage={FALLBACK_IMAGE}
                      alt={item.title}
                      className="relative h-44 w-full bg-slate-100 overflow-hidden shrink-0"
                    >
                      {item.type === "event" && item.eventDate && (
                        <div className="absolute top-2.5 left-2.5 bg-[#1E3A5F] text-white rounded-lg px-2 py-1 shadow-md flex flex-col items-center leading-none text-center border border-white/20 z-10">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-[#D4A017]">
                            {new Date(item.eventDate).toLocaleDateString(undefined, { month: "short" })}
                          </span>
                          <span className="text-sm font-bold font-serif mt-0.5">
                            {new Date(item.eventDate).toLocaleDateString(undefined, { day: "numeric" })}
                          </span>
                        </div>
                      )}
                      {item.isPinned && (
                        <div
                          className="absolute top-2.5 right-2.5 bg-amber-500 text-white rounded-full p-1 shadow-xs z-10"
                          title="Pinned"
                        >
                          <Pin className="h-3 w-3 fill-white" />
                        </div>
                      )}
                    </CardImageRotator>

                    {/* Content Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </Badge>
                        {item.isPinned && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-amber-50 text-amber-900 border-amber-300 font-medium py-0 h-4"
                          >
                            Pinned
                          </Badge>
                        )}
                        {item.publishedAt && (
                          <span className="text-[11px] text-slate-400">{formatDate(item.publishedAt)}</span>
                        )}
                      </div>

                      <h4 className="text-base font-serif text-[#1E3A5F] font-bold leading-snug line-clamp-2">
                        <Link to={`/media?item=${item.id}`} className="hover:underline focus:outline-hidden">
                          {item.title}
                        </Link>
                      </h4>
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{item.summary}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                    <Link
                      to={`/media?item=${item.id}`}
                      className="text-xs font-semibold text-[#1E3A5F] hover:text-[#D4A017] inline-flex items-center gap-1 transition-colors"
                    >
                      {item.type === "event" ? "Event info" : "Read more"}
                      <ArrowRight className="h-3 w-3 text-[#D4A017]" />
                    </Link>
                    <span className="text-[10px] text-slate-400">Card {idx + 2} of {sortedItems.length}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Indicators */}
            <div className="flex items-center justify-center gap-1.5 pt-2" aria-label="Carousel pagination">
              {sortedItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleManualNavigate(() => scrollToSlide(idx))}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx ? "w-6 bg-[#1E3A5F]" : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to card ${idx + 1}`}
                  aria-current={activeIndex === idx ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestUpdatesSection;
