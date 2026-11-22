import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, ArrowRight, ChevronLeft, ChevronRight, FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardImageRotator } from "@/components/ui/CardImageRotator";

type ProjectStatus = "proposed" | "ongoing" | "completed";

interface PlatformProject {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: ProjectStatus;
  timeline: string;
  imageUrl: string;
  partners: string[];
  galleryUrls?: string[];
}

const statusConfig: Record<ProjectStatus, { dot: string; label: string }> = {
  ongoing: {
    dot: "bg-emerald-400",
    label: "Ongoing",
  },
  proposed: {
    dot: "bg-amber-400",
    label: "Pending",
  },
  completed: {
    dot: "bg-sky-400",
    label: "Completed",
  },
};

const ProjectsSection = () => {
  const [projects, setProjects] = useState<PlatformProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(9);

        if (error) throw error;

        if (isMounted) {
          setProjects(
            (data || []).map((row: any) => ({
              id: row.id,
              title: row.title,
              description: row.description,
              location: row.location,
              category: row.category || "",
              status: (row.status as ProjectStatus) || "proposed",
              timeline: row.timeline || "",
              imageUrl: row.image_url || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80",
              partners: row.partners || [],
              galleryUrls: Array.isArray(row.gallery_urls) ? row.gallery_urls : [],
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch featured projects:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

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
  }, [projects.length, updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Scroll by 1 slide width depending on viewport strictly within container
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

  const scrollToSlide = (index: number) => {
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
  };

  return (
    <section className="py-20 md:py-24 bg-background" id="projects">
      <div className="container max-w-6xl space-y-8">
        {/* Section Header with Desktop Carousel Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
              <p className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Our Work</p>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-foreground font-bold tracking-tight">
              Featured Projects
            </h2>
            <p className="text-muted-foreground max-w-xl text-sm md:text-base mt-2">
              From proposals to completion, track the community-driven initiatives transforming neighborhoods.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-300 text-[#1E3A5F] hover:bg-slate-100 hover:text-[#1E3A5F] text-xs font-semibold shadow-xs"
            >
              <Link to="/projects" className="flex items-center gap-1.5">
                View all projects
                <ArrowRight className="h-3.5 w-3.5 text-[#D4A017]" />
              </Link>
            </Button>

            {/* Desktop Navigation Controls */}
            {projects.length > 3 && (
              <div className="hidden md:flex items-center gap-1.5 ml-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scroll("left")}
                  disabled={!canScrollLeft}
                  className="h-8 w-8 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                  aria-label="Previous projects"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scroll("right")}
                  disabled={!canScrollRight}
                  className="h-8 w-8 rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                  aria-label="Next projects"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Carousel / Content Track */}
        {loading ? (
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="w-[85%] md:w-[calc(33.3333%-1rem)] shrink-0 rounded-xl overflow-hidden bg-card border border-border p-4 space-y-4"
              >
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 md:p-12 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FolderKanban className="h-5 w-5" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No published projects yet. Check back soon for community initiatives.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={scrollContainerRef}
              className="flex items-stretch overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 pb-4 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              aria-label="Featured projects carousel track"
            >
              {projects.map((project, idx) => {
                const conf = statusConfig[project.status] || { dot: "bg-slate-400", label: project.status };
                return (
                  <div
                    key={project.id}
                    className="w-[85%] min-w-[280px] md:w-[calc(33.3333%-1rem)] shrink-0 snap-start self-stretch h-auto flex flex-col justify-between rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow group"
                  >
                    {/* Project Cover Image */}
                    <CardImageRotator
                      images={[project.imageUrl, ...(project.galleryUrls || [])]}
                      fallbackImage="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80"
                      alt={project.title}
                      className="relative h-52 overflow-hidden bg-slate-100 shrink-0"
                    >
                      {/* High-Contrast Frosted Status Pill */}
                      <div
                        className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/85 text-white backdrop-blur-md border border-white/20 shadow-md z-10"
                      >
                        <span className={`h-2 w-2 rounded-full ${conf.dot}`} />
                        {conf.label}
                      </div>
                    </CardImageRotator>

                    {/* Inner Content Wrapper below image stretches to fill remaining height */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-serif text-foreground font-bold leading-snug line-clamp-2 group-hover:text-[#1E3A5F] transition-colors">
                          <Link to={`/projects/${project.id}`} className="hover:underline focus:outline-hidden line-clamp-2">
                            {project.title}
                          </Link>
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                          {project.description}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D4A017] shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </span>
                        {project.partners && project.partners.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{project.partners.join(", ")}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pinned Bottom Footer Row */}
                    <div className="px-6 pb-6 pt-3 mt-auto border-t border-slate-100/70 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-0 text-[#1E3A5F] hover:text-[#1E3A5F]/80 font-semibold"
                        asChild
                      >
                        <Link to={`/projects/${project.id}`}>
                          Learn More <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Link>
                      </Button>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {idx + 1} of {projects.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Centered Pagination Indicators */}
            {projects.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2" aria-label="Projects pagination">
                {projects.map((proj, idx) => (
                  <button
                    key={proj.id}
                    onClick={() => scrollToSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeIndex === idx ? "w-6 bg-[#1E3A5F]" : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                    aria-label={`Go to project slide ${idx + 1}`}
                    aria-current={activeIndex === idx ? "true" : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* View All Projects Button */}
        <div className="text-center pt-4">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-slate-300 text-[#1E3A5F] hover:bg-slate-100 font-semibold"
          >
            <Link to="/projects">View All Projects</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
