import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLatestUpdates } from "@/database/operations";
import { type MediaArticle } from "@/database/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Pin, ArrowRight, Star } from "lucide-react";

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

  useEffect(() => {
    let isMounted = true;
    const fetchUpdates = async () => {
      try {
        const data = await getLatestUpdates(3);
        if (isMounted) {
          setItems(data);
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
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  const featured = items[0];
  const secondaryItems = items.slice(1, 3);

  return (
    <section
      aria-label="Latest Updates and Announcements"
      className="py-12 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200"
    >
      <div className="container max-w-6xl space-y-8">
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

          <Button
            asChild
            variant="outline"
            size="sm"
            className="self-start sm:self-auto border-slate-300 text-[#1E3A5F] hover:bg-slate-100 hover:text-[#1E3A5F] text-xs font-semibold shadow-xs"
          >
            <Link to="/media" className="flex items-center gap-1.5">
              View all updates
              <ArrowRight className="h-3.5 w-3.5 text-[#D4A017]" />
            </Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">No published updates or announcements yet.</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Check back soon for community announcements, scheduled events, and impact stories across the ecosystem.
            </p>
            <div className="pt-2">
              <Button asChild size="sm" variant="outline" className="border-slate-300 text-xs">
                <Link to="/media">Visit Newsroom</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 1 Featured Card */}
            {featured && (
              <div className="group rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden grid md:grid-cols-12 min-h-[300px]">
            {/* Visual Cover Image */}
            <div className="relative md:col-span-5 h-56 md:h-full min-h-[220px] bg-slate-100 overflow-hidden">
              <img
                src={featured.imageUrl || FALLBACK_IMAGE}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = FALLBACK_IMAGE;
                }}
              />

              {/* Event Date Badge on Image */}
              {featured.type === "event" && featured.eventDate && (
                <div className="absolute top-3 left-3 bg-[#1E3A5F] text-white rounded-lg px-2.5 py-1.5 shadow-md flex flex-col items-center leading-none text-center border border-white/20">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A017]">
                    {new Date(featured.eventDate).toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <span className="text-base font-bold font-serif mt-0.5">
                    {new Date(featured.eventDate).toLocaleDateString(undefined, { day: "numeric" })}
                  </span>
                </div>
              )}

              {/* Pinned Indicator Badge */}
              {featured.isPinned && (
                <div
                  className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5 shadow-md"
                  title="Pinned Editorial Priority"
                >
                  <Pin className="h-3.5 w-3.5 fill-white" />
                </div>
              )}
            </div>

            {/* Featured Details */}
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
                    <span className="text-xs text-slate-500 font-medium">
                      • {featured.category}
                    </span>
                  )}

                  {featured.type === "event" && featured.eventDate ? (
                    <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#D4A017]" />
                      {formatDate(featured.eventDate)}
                    </span>
                  ) : featured.publishedAt ? (
                    <span className="text-xs text-slate-400">
                      {formatDate(featured.publishedAt)}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-xl md:text-2xl font-serif text-[#1E3A5F] font-bold leading-snug line-clamp-2 group-hover:text-[#1E3A5F]/90">
                  <Link
                    to={`/media?item=${featured.id}`}
                    className="hover:underline focus:outline-hidden"
                  >
                    {featured.title}
                  </Link>
                </h3>

                <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                  {featured.summary}
                </p>
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

                <Link
                  to="/media"
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  All updates &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2 Smaller Cards Below */}
        {secondaryItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {secondaryItems.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col sm:flex-row h-full"
              >
                {/* Thumbnail */}
                <div className="relative sm:w-44 h-40 sm:h-auto shrink-0 bg-slate-100 overflow-hidden">
                  <img
                    src={item.imageUrl || FALLBACK_IMAGE}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = FALLBACK_IMAGE;
                    }}
                  />
                  {item.isPinned && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1 shadow-xs">
                      <Pin className="h-3 w-3 fill-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </Badge>
                      {item.type === "event" && item.eventDate ? (
                        <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#D4A017]" />
                          {formatDate(item.eventDate)}
                        </span>
                      ) : item.publishedAt ? (
                        <span className="text-[11px] text-slate-400">
                          {formatDate(item.publishedAt)}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-base font-serif text-[#1E3A5F] font-bold leading-snug line-clamp-2">
                      <Link
                        to={`/media?item=${item.id}`}
                        className="hover:underline focus:outline-hidden"
                      >
                        {item.title}
                      </Link>
                    </h4>

                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                      {item.summary}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      to={`/media?item=${item.id}`}
                      className="text-xs font-semibold text-[#1E3A5F] hover:text-[#D4A017] inline-flex items-center gap-1 transition-colors"
                    >
                      {item.type === "event" ? "Event info" : "Read more"}
                      <ArrowRight className="h-3 w-3 text-[#D4A017]" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </section>
  );
};

export default LatestUpdatesSection;
