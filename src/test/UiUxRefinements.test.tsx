import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSuggestionsPage from "@/pages/admin/AdminSuggestionsPage";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CardImageRotator } from "@/components/ui/CardImageRotator";
import ProjectsPage from "@/pages/public/ProjectsPage";
import LatestUpdatesSection from "@/components/sections/home/LatestUpdatesSection";
import * as operations from "@/database/operations";
import { supabase } from "@/database/client";

// Mock Supabase calls
vi.mock("@/database/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
    },
  };
});

describe("UI/UX Refinements Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Task 1: Camouflaged 'View' Button in Project Suggestions", () => {
    it("renders the View button with visible background tint, navy text, border, and focus states", async () => {
      const mockSuggestions = [
        {
          id: "sug-1",
          title: "Borehole Solar Installation",
          description: "Solar powered water pumps for rural school.",
          location: "Tamale",
          timeline: "3 months",
          submitted_by: "Ama Mensah",
          email: "ama@example.com",
          category: "Water & Sanitation",
          expected_budget: 15000,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockSuggestions, error: null }),
        }),
      });

      render(
        <MemoryRouter>
          <AdminSuggestionsPage />
        </MemoryRouter>
      );

      // Wait for suggestion to render
      await waitFor(() => {
        const matches = screen.getAllByText("Borehole Solar Installation");
        expect(matches.length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByRole("button", { name: /view/i });
      expect(viewButtons.length).toBeGreaterThan(0);

      // Inspect desktop table view button
      const desktopViewBtn = viewButtons[0];
      expect(desktopViewBtn).toHaveClass("bg-[#1E3A5F]/10");
      expect(desktopViewBtn).toHaveClass("text-[#1E3A5F]");
      expect(desktopViewBtn).toHaveClass("border-[#1E3A5F]/20");
      expect(desktopViewBtn).toHaveClass("hover:bg-[#1E3A5F]/20");
      expect(desktopViewBtn).toHaveClass("focus-visible:ring-2");

      // Verify clicking View opens the detail modal
      fireEvent.click(desktopViewBtn);
      await waitFor(() => {
        expect(screen.getByText("Concept Description")).toBeInTheDocument();
        const matches = screen.getAllByText("Solar powered water pumps for rural school.");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Task 2: Table Header Hierarchy & Contrast", () => {
    it("renders TableHeader with subtle blue-grey background, dark navy semibold text, and row hover", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Community Member</TableHead>
              <TableHead>Clearance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const thead = container.querySelector("thead");
      expect(thead).toBeInTheDocument();
      expect(thead).toHaveClass("bg-[#F1F5F9]");
      expect(thead).toHaveClass("border-b");

      const th = screen.getByText("Community Member");
      expect(th).toHaveClass("text-[#1E3A5F]");
      expect(th).toHaveClass("font-semibold");
    });
  });

  describe("Task 4: CardImageRotator for Multi-Image Cards", () => {
    it("renders a static image without extra controls when single image is passed", () => {
      render(
        <CardImageRotator
          images={["https://images.unsplash.com/photo-1?w=800"]}
          alt="Single Image Test"
        />
      );

      const img = screen.getByAltText("Single Image Test");
      expect(img).toBeInTheDocument();
      expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Image gallery dots")).not.toBeInTheDocument();
    });

    it("renders navigation controls and pagination dots when multiple images are passed", () => {
      const images = [
        "https://images.unsplash.com/photo-1?w=800",
        "https://images.unsplash.com/photo-2?w=800",
        "https://images.unsplash.com/photo-3?w=800",
      ];

      render(<CardImageRotator images={images} alt="Multi Image Project" />);

      expect(screen.getByLabelText("Previous image")).toBeInTheDocument();
      expect(screen.getByLabelText("Next image")).toBeInTheDocument();
      expect(screen.getByLabelText("Image gallery dots")).toBeInTheDocument();

      // Clicking Next changes active view
      const nextBtn = screen.getByLabelText("Next image");
      fireEvent.click(nextBtn);

      const view2 = screen.getByAltText("Multi Image Project - view 2");
      expect(view2).toHaveClass("opacity-100");
    });

    it("pauses rotation on mouse hover and touch", () => {
      vi.useFakeTimers();

      const images = [
        "https://images.unsplash.com/photo-1?w=800",
        "https://images.unsplash.com/photo-2?w=800",
      ];

      const { container } = render(<CardImageRotator images={images} alt="Hover Test" intervalMs={4000} />);

      const rotator = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(rotator);

      // Advance timers by 8 seconds; image should remain on view 1 because it's paused
      vi.advanceTimersByTime(8000);
      const view1 = screen.getByAltText("Hover Test - view 1");
      expect(view1).toHaveClass("opacity-100");

      vi.useRealTimers();
    });
  });

  describe("Task 5: Reduce 'View Details' Button Width on Projects Page", () => {
    it("renders compact left-aligned 'View Details' button on desktop with responsive full width on mobile", async () => {
      const mockProjects = [
        {
          id: "proj-1",
          title: "Clean Water Community Well",
          description: "Providing potable drinking water to 500 households.",
          location: "Eastern Region",
          category: "Water",
          status: "ongoing",
          timeline: "Jan 2026 - Jun 2026",
          image_url: "https://images.unsplash.com/photo-water",
          partners: ["UNICEF", "Local Council"],
          gallery_urls: [],
          created_at: new Date().toISOString(),
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        }),
      });

      render(
        <MemoryRouter>
          <ProjectsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Clean Water Community Well")).toBeInTheDocument();
      });

      const detailsLink = screen.getByRole("link", { name: /view details/i });
      expect(detailsLink).toBeInTheDocument();
      expect(detailsLink.getAttribute("href")).toBe("/projects/proj-1");

      // Because <Button asChild> delegates to the child <Link>, classes are directly on detailsLink
      expect(detailsLink).toHaveClass("sm:w-auto");
      expect(detailsLink).toHaveClass("w-full");
      expect(detailsLink).toHaveClass("border-[#1E3A5F]");
      expect(detailsLink).toHaveClass("text-[#1E3A5F]");
      expect(detailsLink).toHaveClass("px-4");
    });
  });

  describe("Task 3 & Stability: Carousel Slide Changes Never Alter Document Scroll Position", () => {
    it("never calls scrollIntoView or window.scrollTo and keeps document scroll position stationary during slide changes", async () => {
      const scrollIntoViewSpy = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewSpy;

      const windowScrollToSpy = vi.spyOn(window, "scrollTo");

      // Simulate visitor having scrolled 900px down the page
      Object.defineProperty(window, "scrollY", { value: 900, writable: true, configurable: true });

      const mockItems = [
        {
          id: "item-1",
          title: "Update 1",
          summary: "Summary 1",
          content: "Content 1",
          author: "BIH",
          category: "News",
          publishedAt: "2026-11-20",
          imageUrl: "https://images.unsplash.com/photo-1",
          imageUrls: ["https://images.unsplash.com/photo-1"],
          type: "announcement" as const,
          isPinned: false,
          galleryUrls: [],
        },
        {
          id: "item-2",
          title: "Update 2",
          summary: "Summary 2",
          content: "Content 2",
          author: "BIH",
          category: "News",
          publishedAt: "2026-11-21",
          imageUrl: "https://images.unsplash.com/photo-2",
          imageUrls: ["https://images.unsplash.com/photo-2"],
          type: "announcement" as const,
          isPinned: false,
          galleryUrls: [],
        },
      ];

      vi.spyOn(operations, "getLatestUpdates").mockResolvedValue(mockItems);

      render(
        <MemoryRouter>
          <LatestUpdatesSection />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Update 1")).toBeInTheDocument();
      });

      // Target the internal container scrollTo mock
      const track = screen.getByLabelText("Updates carousel track");
      const containerScrollToSpy = vi.fn();
      track.scrollTo = containerScrollToSpy;

      // Click on dot 2
      const dot2 = screen.getByLabelText("Go to card 2");
      fireEvent.click(dot2);

      // Verify scrollIntoView was NEVER called
      expect(scrollIntoViewSpy).not.toHaveBeenCalled();

      // Verify window.scrollTo was NEVER called by the carousel slide change
      expect(windowScrollToSpy).not.toHaveBeenCalled();

      // Verify window.scrollY remained completely stationary at 900
      expect(window.scrollY).toBe(900);

      // Verify track container handled the scroll internally
      expect(containerScrollToSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: "smooth",
        })
      );
    });
  });
});
