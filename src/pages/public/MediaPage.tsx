import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllPublishedMediaArticles } from "@/database/operations";
import { type MediaArticle, type UpdateType } from "@/database/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CardImageRotator } from "@/components/ui/CardImageRotator";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Download,
  AlertCircle,
  FileText,
  Pin,
  Clock,
  CalendarPlus,
  Search,
  X,
  Star,
  Share2,
  InstagramIcon,
} from "lucide-react";
import { VideoEmbed } from "@/components/common/VideoEmbed";

const INITIAL_VISIBLE_COUNT = 9;
const LOAD_MORE_INCREMENT = 6;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80";

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

const MediaPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<MediaArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<MediaArticle | null>(null);
  const [eventSubTab, setEventSubTab] = useState<"upcoming" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Type tab derived from URL ?type=
  const rawTypeParam = searchParams.get("type");
  const activeTab: "all" | UpdateType = useMemo(() => {
    if (rawTypeParam === "announcements" || rawTypeParam === "announcement") return "announcement";
    if (rawTypeParam === "events" || rawTypeParam === "event") return "event";
    if (rawTypeParam === "media") return "media";
    return "all";
  }, [rawTypeParam]);

  const handleTabChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val === "all") {
        next.delete("type");
      } else if (val === "announcement") {
        next.set("type", "announcements");
      } else if (val === "event") {
        next.set("type", "events");
      } else {
        next.set("type", val);
      }
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchArticles = async () => {
      try {
        const data = await getAllPublishedMediaArticles();
        if (!isMounted) return;
        setArticles(data);

        // Check for deep link ?item=<id>
        const itemId = searchParams.get("item");
        if (itemId) {
          const match = data.find((a) => a.id === itemId);
          if (match) {
            setSelectedArticle(match);
          }
        }
      } catch (err) {
        console.error("Failed to fetch media articles:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchArticles();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeTab, selectedCategory, searchQuery]);

  const handleOpenArticle = (art: MediaArticle) => {
    setSelectedArticle(art);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("item", art.id);
      return next;
    });
  };

  const handleCloseDialog = () => {
    setSelectedArticle(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("item");
      return next;
    });
  };

  // Distinct categories available in articles
  const categories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.category && a.category.trim()) {
        set.add(a.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [articles]);

  // General filtered list matching tab, category and search
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      // 1. Type tab
      if (activeTab !== "all" && a.type !== activeTab) {
        return false;
      }
      // 2. Topic/Category chip
      if (selectedCategory !== "all" && a.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = a.title?.toLowerCase().includes(query);
        const matchesSummary = a.summary?.toLowerCase().includes(query);
        const matchesContent = a.content?.toLowerCase().includes(query);
        const matchesAuthor = a.author?.toLowerCase().includes(query);
        const matchesLocation = a.eventLocation?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSummary && !matchesContent && !matchesAuthor && !matchesLocation) {
          return false;
        }
      }
      return true;
    });
  }, [articles, activeTab, selectedCategory, searchQuery]);

  // Split events into upcoming and past (using filtered list)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredArticles
      .filter((a) => a.type === "event" && a.eventDate && new Date(a.eventDate) >= now)
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());
  }, [filteredArticles]);

  const pastEvents = useMemo(() => {
    const now = new Date();
    return filteredArticles
      .filter((a) => a.type === "event" && (!a.eventDate || new Date(a.eventDate) < now))
      .sort((a, b) => {
        const timeA = new Date(a.eventDate || a.publishedAt).getTime();
        const timeB = new Date(b.eventDate || b.publishedAt).getTime();
        return timeB - timeA;
      });
  }, [filteredArticles]);

  // Paginated articles for standard grid
  const paginatedArticles = useMemo(() => {
    return filteredArticles.slice(0, visibleCount);
  }, [filteredArticles, visibleCount]);

  const hasMore = visibleCount < filteredArticles.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_INCREMENT);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    handleTabChange("all");
  };

  const generateIcsFile = (article: MediaArticle) => {
    if (!article.eventDate) return;
    const startDate = new Date(article.eventDate);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Bridge for Impact Hub//Updates//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${article.id}@bridgeforimpacthub.org`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${article.title.replace(/\n/g, " ")}`,
      `DESCRIPTION:${article.summary.replace(/\n/g, " ")}`,
      `LOCATION:${(article.eventLocation || "").replace(/\n/g, " ")}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${article.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderCard = (article: MediaArticle) => (
    <Card
      key={article.id}
      className="overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md flex flex-col justify-between border-slate-200 group bg-white"
      onClick={() => handleOpenArticle(article)}
    >
      <div>
        <CardImageRotator
          images={[article.imageUrl, ...(article.imageUrls || []), ...(article.galleryUrls || [])]}
          fallbackImage={FALLBACK_IMAGE}
          alt={article.title}
          className="relative h-48 w-full overflow-hidden bg-slate-100 shrink-0"
        >
          {/* Event Date Badge */}
          {article.type === "event" && article.eventDate && (
            <div className="absolute top-3 left-3 bg-[#1E3A5F] text-white rounded-lg px-2.5 py-1.5 shadow-md flex flex-col items-center leading-none text-center border border-white/20 z-10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A017]">
                {new Date(article.eventDate).toLocaleDateString(undefined, { month: "short" })}
              </span>
              <span className="text-base font-bold font-serif mt-0.5">
                {new Date(article.eventDate).toLocaleDateString(undefined, { day: "numeric" })}
              </span>
            </div>
          )}

          {/* Pinned Badge */}
          {article.isPinned && (
            <div
              className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5 shadow-md z-10"
              title="Featured update"
            >
              <Pin className="h-3.5 w-3.5 fill-white" />
            </div>
          )}
        </CardImageRotator>

        <CardHeader className="space-y-2.5 pt-4 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(
                article.type
              )}`}
            >
              {article.type}
            </Badge>
            {article.category && (
              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 font-sans">
                {article.category}
              </Badge>
            )}
            {article.isPinned && (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-900 border-amber-300 font-medium flex items-center gap-1"
              >
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Featured
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg text-[#1E3A5F] font-bold font-serif line-clamp-2 leading-snug group-hover:text-[#1E3A5F]/90">
            {article.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-xs text-muted-foreground pb-4">
          <p className="line-clamp-3 leading-relaxed text-slate-600">{article.summary}</p>

          {/* Event Location Info */}
          {article.type === "event" && article.eventLocation && (
            <p className="text-[11px] text-slate-700 flex items-center gap-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 text-[#D4A017] shrink-0" />
              <span className="truncate">{article.eventLocation}</span>
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <span>By {article.author}</span>
            <span>
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : ""}
            </span>
          </div>
        </CardContent>
      </div>

      <div className="px-6 pb-4 pt-0">
        <Button
          variant="link"
          className="px-0 text-[#1E3A5F] hover:text-[#D4A017] font-semibold text-xs flex items-center gap-1"
        >
          {article.type === "event" ? "Event details" : "Read full update"} &rarr;
        </Button>
      </div>
    </Card>
  );

  return (
    <section className="py-16 bg-slate-50/40 min-h-screen">
      <div className="container space-y-8 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
              <p className="text-xs font-semibold text-[#D4A017] uppercase tracking-widest">
                Updates & Media
              </p>
            </div>
            <h1 className="text-3xl md:text-5xl text-[#1E3A5F] font-serif font-bold tracking-tight">
              Announcements, Events & Impact
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed">
              Stay informed with the latest organizational announcements, upcoming community gatherings, and impact stories across the Bridge for Impact Hub ecosystem.
            </p>
          </div>

          <a
            href="https://instagram.com/bridgeforimpact_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#1E3A5F] shadow-xs hover:shadow-sm transition-all self-start sm:self-auto shrink-0 group"
            aria-label="Connect with BIH on social media (@bridgeforimpact_hub)"
          >
            <InstagramIcon className="h-3.5 w-3.5 text-[#D4A017] group-hover:scale-110 transition-transform" />
            <span>Connect @bridgeforimpact_hub</span>
            <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-[#1E3A5F] transition-colors" />
          </a>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Primary Type Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
              <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto">
                <TabsTrigger value="all" className="text-xs font-medium">
                  All ({articles.length})
                </TabsTrigger>
                <TabsTrigger value="announcement" className="text-xs font-medium">
                  Announcements ({articles.filter((a) => a.type === "announcement").length})
                </TabsTrigger>
                <TabsTrigger value="event" className="text-xs font-medium">
                  Events ({articles.filter((a) => a.type === "event").length})
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs font-medium">
                  Media ({articles.filter((a) => a.type === "media").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search updates, events, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 text-xs bg-slate-50 border-slate-200 focus:bg-white h-9 rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Topic / Category Chips */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Category:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-[#1E3A5F] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? "bg-[#1E3A5F] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-xl overflow-hidden bg-white border border-slate-200 p-4 space-y-4 animate-pulse"
              >
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))}
          </div>
        ) : activeTab === "event" ? (
          /* Events Tab: Sub-split into Upcoming and Past */
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setEventSubTab("upcoming")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  eventSubTab === "upcoming"
                    ? "bg-[#1E3A5F] text-white"
                    : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                }`}
              >
                Upcoming Events ({upcomingEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setEventSubTab("past")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  eventSubTab === "past"
                    ? "bg-[#1E3A5F] text-white"
                    : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                }`}
              >
                Past Events ({pastEvents.length})
              </button>
            </div>

            {eventSubTab === "upcoming" ? (
              upcomingEvents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 space-y-2">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No upcoming events found</p>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery || selectedCategory !== "all"
                      ? "Try clearing your search or category filter."
                      : "Check back soon for new community workshops and conferences."}
                  </p>
                  {(searchQuery || selectedCategory !== "all") && (
                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs mt-2">
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.map(renderCard)}
                </div>
              )
            ) : pastEvents.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200 space-y-2">
                <Clock className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No past events recorded</p>
                {(searchQuery || selectedCategory !== "all") && (
                  <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs mt-2">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map(renderCard)}
              </div>
            )}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 space-y-3">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-700">No updates found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || selectedCategory !== "all"
                ? `No results match your active filters${searchQuery ? ` ("${searchQuery}")` : ""}.`
                : "There are currently no published updates in this section."}
            </p>
            {(searchQuery || selectedCategory !== "all" || activeTab !== "all") && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs mt-2">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Updates Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedArticles.map(renderCard)}
            </div>

            {/* Load More Pagination */}
            {hasMore ? (
              <div className="text-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="border-slate-300 text-[#1E3A5F] hover:bg-slate-100 text-xs px-6 py-2 h-9 font-semibold shadow-xs"
                >
                  Load More Updates ({filteredArticles.length - visibleCount} remaining)
                </Button>
              </div>
            ) : filteredArticles.length > INITIAL_VISIBLE_COUNT ? (
              <p className="text-center text-xs text-slate-400 pt-2">
                Showing all {filteredArticles.length} updates
              </p>
            ) : null}
          </div>
        )}

        {/* Detailed Modal Dialog */}
        <Dialog open={selectedArticle !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
            {selectedArticle && (
              <div className="space-y-5 pt-2">
                <DialogHeader className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`text-[10px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(
                        selectedArticle.type
                      )}`}
                    >
                      {selectedArticle.type}
                    </Badge>
                    {selectedArticle.category && (
                      <Badge variant="outline" className="text-xs text-slate-600">
                        {selectedArticle.category}
                      </Badge>
                    )}
                    {selectedArticle.isPinned && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="font-serif text-[#1E3A5F] text-2xl font-bold leading-tight">
                    {selectedArticle.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    By {selectedArticle.author} •{" "}
                    {selectedArticle.publishedAt
                      ? new Date(selectedArticle.publishedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Recently added"}
                  </DialogDescription>
                </DialogHeader>

                {/* Cover Image */}
                {selectedArticle.imageUrl && (
                  <img
                    src={selectedArticle.imageUrl}
                    alt={selectedArticle.title}
                    className="w-full h-64 object-cover rounded-xl border bg-slate-100"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = FALLBACK_IMAGE;
                    }}
                  />
                )}

                {/* Event Logistics Banner & Add to Calendar */}
                {selectedArticle.type === "event" && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3 text-xs text-amber-950">
                      {selectedArticle.eventDate && (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-[#D4A017] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-900">Date & Time</p>
                            <p className="text-slate-700">
                              {new Date(selectedArticle.eventDate).toLocaleDateString(undefined, {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedArticle.eventLocation && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-[#D4A017] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-900">Location</p>
                            <p className="text-slate-700">{selectedArticle.eventLocation}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                      {selectedArticle.eventDate && (
                        <Button
                          size="sm"
                          onClick={() => generateIcsFile(selectedArticle)}
                          className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-1.5 text-xs h-8"
                        >
                          <CalendarPlus className="h-3.5 w-3.5 text-[#D4A017]" />
                          Add to Calendar (.ics)
                        </Button>
                      )}

                      {selectedArticle.eventLink && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-900 hover:bg-amber-100/60 gap-1.5 text-xs h-8"
                        >
                          <a href={selectedArticle.eventLink} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Join / Event Details
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary Quote */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-700 italic leading-relaxed">
                  &quot;{selectedArticle.summary}&quot;
                </div>

                {/* Full Narrative Content */}
                <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line space-y-3 font-sans">
                  {selectedArticle.content}
                </div>

                {/* Featured Video Player */}
                {selectedArticle.videoUrl && (
                  <div className="pt-2">
                    <VideoEmbed url={selectedArticle.videoUrl} title={selectedArticle.title} />
                  </div>
                )}

                {/* PDF Document Attachment Link */}
                {selectedArticle.attachmentUrl && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          Official Update Document (PDF)
                        </p>
                        <p className="text-[10px] text-muted-foreground">Supporting report / press release</p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="border-slate-300 text-xs gap-1.5 shrink-0">
                      <a href={selectedArticle.attachmentUrl} target="_blank" rel="noreferrer" download>
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </Button>
                  </div>
                )}

                {/* Gallery Grid */}
                {selectedArticle.galleryUrls && selectedArticle.galleryUrls.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Photo Gallery ({selectedArticle.galleryUrls.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedArticle.galleryUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group"
                        >
                          <img
                            src={url}
                            alt={`${selectedArticle.title} gallery ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Link */}
                {selectedArticle.fullStoryUrl && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                      <a href={selectedArticle.fullStoryUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Read external source
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default MediaPage;
