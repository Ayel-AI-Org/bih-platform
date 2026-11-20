import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronLeft, ChevronRight, Pin, ArrowRight } from "lucide-react";
import { type UpdateType } from "@/database/types";

interface CarouselUpdateItem {
  id: string;
  title: string;
  summary: string;
  type: UpdateType;
  imageUrl: string;
  eventDate?: string | null;
  publishedAt?: string | null;
  isPinned: boolean;
}

export const UpdatesCarousel = () => {
  const [items, setItems] = useState<CarouselUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchTopUpdates = async () => {
      try {
        const { data, error } = await supabase
          .from("media_articles")
          .select("id, title, summary, type, image_url, event_date, published_at, is_pinned")
          .eq("is_published", true)
          .order("is_pinned", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        setItems(
          (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            summary: row.summary || "",
            type: (row.type as UpdateType) || "media",
            imageUrl: row.image_url || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
            eventDate: row.event_date || null,
            publishedAt: row.published_at || null,
            isPinned: row.is_pinned || false,
          }))
        );
      } catch (err) {
        console.error("Failed to load updates carousel:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopUpdates();
  }, []);

  // Update current index when Embla selects a slide
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    onSelect();

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Autoplay 6s with pause on hover/focus and prefers-reduced-motion check
  useEffect(() => {
    if (!api || items.length <= 1 || isPaused) return;

    // Check if user has requested reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [api, isPaused, items.length]);

  const handlePrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const handleNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // Hide the section when empty
  if (!loading && items.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container max-w-6xl">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Latest Updates and Announcements"
      className="py-10 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="container max-w-6xl space-y-4">
        {/* Header row with arrows */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
              <p className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">
                Latest Updates
              </p>
            </div>
            <h2 className="text-xl md:text-2xl font-serif text-[#1E3A5F] font-bold">
              What's Happening Across Our Community
            </h2>
          </div>

          {/* Navigation Controls */}
          {items.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="h-8 w-8 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs"
                aria-label="Previous update"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-8 w-8 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs"
                aria-label="Next update"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Carousel Container */}
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {items.map((item) => (
              <CarouselItem key={item.id} className="basis-full">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden grid md:grid-cols-12 min-h-[260px] md:min-h-[280px]">
                  {/* Visual Image / Thumbnail */}
                  <div className="relative md:col-span-5 h-48 md:h-full bg-slate-100 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "/placeholder.svg";
                      }}
                    />

                    {/* Date Badge for Event */}
                    {item.type === "event" && item.eventDate && (
                      <div className="absolute top-3 left-3 bg-[#1E3A5F] text-white rounded-lg px-2.5 py-1.5 shadow-md flex flex-col items-center leading-none text-center border border-white/20">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A017]">
                          {new Date(item.eventDate).toLocaleDateString(undefined, { month: "short" })}
                        </span>
                        <span className="text-sm font-bold font-serif mt-0.5">
                          {new Date(item.eventDate).toLocaleDateString(undefined, { day: "numeric" })}
                        </span>
                      </div>
                    )}

                    {item.isPinned && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5 shadow-md">
                        <Pin className="h-3 w-3 fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Content Details */}
                  <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[9px] uppercase font-bold tracking-wider border-none text-white ${
                            item.type === "announcement"
                              ? "bg-[#1E3A5F]"
                              : item.type === "event"
                              ? "bg-[#D4A017]"
                              : "bg-slate-700"
                          }`}
                        >
                          {item.type}
                        </Badge>

                        {item.isPinned && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-900 border-amber-300 font-sans">
                            Featured
                          </Badge>
                        )}

                        {item.type === "event" && item.eventDate && (
                          <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[#D4A017]" />
                            {new Date(item.eventDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl md:text-2xl font-serif text-[#1E3A5F] font-bold leading-snug line-clamp-2">
                        {item.title}
                      </h3>

                      <p className="text-slate-600 text-xs md:text-sm leading-relaxed line-clamp-3">
                        {item.summary}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <Button
                        asChild
                        size="sm"
                        className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs gap-1.5 h-8 shadow-xs"
                      >
                        <Link to={`/media?item=${item.id}`}>
                          {item.type === "event" ? "View Event" : "Read Full Story"}
                          <ArrowRight className="h-3.5 w-3.5 text-[#D4A017]" />
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        <Link to="/media">All updates &rarr;</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Indicator Dots */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => api?.scrollTo(idx)}
                className={`h-2 rounded-full transition-all ${
                  current === idx
                    ? "w-6 bg-[#1E3A5F]"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpdatesCarousel;
