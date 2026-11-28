import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/public/Index";
import PromotionalVideoShowcase from "@/components/sections/home/PromotionalVideoShowcase";
import HomepageShowcaseManager from "@/components/admin/HomepageShowcaseManager";
import { parseVideoUrl } from "@/components/common/VideoEmbed";
import * as operations from "@/database/operations";
import { type HomepageShowcaseSettings, type MediaArticle } from "@/database/types";

const mockItem = (overrides: Partial<MediaArticle> = {}): MediaArticle => ({
  id: "test-update-1",
  title: "Community Outreach Milestone",
  summary: "Exciting progress in our localized education outreach programs.",
  content: "Full detailed story about the outreach.",
  author: "BIH Editorial",
  category: "Initiative",
  publishedAt: "2026-11-20",
  imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  imageUrls: ["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"],
  type: "announcement",
  isPinned: false,
  galleryUrls: [],
  ...overrides,
});

describe("BIH Homepage Showcase & Promotional Video Feature", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Video URL Parser Utility", () => {
    it("correctly identifies YouTube URLs in various standard formats", () => {
      const yt1 = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(yt1.type).toBe("youtube");
      expect(yt1.embedUrl).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");

      const yt2 = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(yt2.type).toBe("youtube");

      const yt3 = parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
      expect(yt3.type).toBe("youtube");
    });

    it("correctly identifies Vimeo URLs", () => {
      const vimeo = parseVideoUrl("https://vimeo.com/123456789");
      expect(vimeo.type).toBe("vimeo");
      expect(vimeo.embedUrl).toContain("https://player.vimeo.com/video/123456789");
    });

    it("correctly identifies direct video files", () => {
      const direct = parseVideoUrl("https://example.com/videos/promo.mp4");
      expect(direct.type).toBe("direct");
      expect(direct.embedUrl).toBe("https://example.com/videos/promo.mp4");
    });

    it("handles empty or unrecognized URLs gracefully", () => {
      const empty = parseVideoUrl("");
      expect(empty.type).toBe("unknown");

      const custom = parseVideoUrl("https://example.com/stream");
      expect(custom.type).toBe("unknown");
    });
  });

  describe("Mode A: Latest Updates (Default)", () => {
    it("renders LatestUpdatesSection and does NOT render PromotionalVideoShowcase when mode is 'updates'", async () => {
      vi.spyOn(operations, "getHomepageShowcaseSettings").mockResolvedValue({
        mode: "updates",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "Beyond awareness. Into impact.",
        videoDescription: "Discover who we are and what we stand for.",
        thumbnailUrl: "",
        ctaText: "Discover Our Mission",
        ctaUrl: "/about",
        showLatestUpdatesBelow: false,
      });

      vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([mockItem()]);
      vi.spyOn(operations, "getTopPinnedUpdate").mockResolvedValue(null);

      render(
        <MemoryRouter>
          <Index />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Latest Updates section should be rendered
        expect(screen.getByText("Latest Updates")).toBeInTheDocument();
        expect(screen.getByText("What's Happening Across Our Community")).toBeInTheDocument();
        expect(screen.getByText("Community Outreach Milestone")).toBeInTheDocument();

        // Promotional video showcase should NOT be rendered
        expect(screen.queryByLabelText("Promotional Video Showcase")).not.toBeInTheDocument();
        expect(screen.queryByText("Our Story in Motion")).not.toBeInTheDocument();
      });
    });
  });

  describe("Mode B: Promotional Video Showcase", () => {
    it("renders PromotionalVideoShowcase and hides LatestUpdatesSection when mode is 'video' and showLatestUpdatesBelow is false", async () => {
      vi.spyOn(operations, "getHomepageShowcaseSettings").mockResolvedValue({
        mode: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "Empowering Resilient Communities",
        videoDescription: "Watch how BIH creates real-world social impact across West Africa.",
        thumbnailUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200",
        ctaText: "Explore Initiatives",
        ctaUrl: "/projects",
        showLatestUpdatesBelow: false,
      });

      vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([mockItem()]);
      vi.spyOn(operations, "getTopPinnedUpdate").mockResolvedValue(null);

      render(
        <MemoryRouter>
          <Index />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Video Showcase should be rendered with configured title and description
        expect(screen.getByLabelText("Promotional Video Showcase")).toBeInTheDocument();
        expect(screen.getByText("Empowering Resilient Communities")).toBeInTheDocument();
        expect(
          screen.getByText("Watch how BIH creates real-world social impact across West Africa.")
        ).toBeInTheDocument();
        expect(screen.getByText("Explore Initiatives")).toBeInTheDocument();

        // Latest Updates section should be suppressed
        expect(screen.queryByLabelText("Latest Updates and Announcements")).not.toBeInTheDocument();
        expect(screen.queryByText("What's Happening Across Our Community")).not.toBeInTheDocument();
      });
    });

    it("renders BOTH PromotionalVideoShowcase and LatestUpdatesSection when showLatestUpdatesBelow is true", async () => {
      vi.spyOn(operations, "getHomepageShowcaseSettings").mockResolvedValue({
        mode: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "Beyond awareness. Into impact.",
        videoDescription: "Discover who we are and what we stand for.",
        thumbnailUrl: "",
        ctaText: "Discover Our Mission",
        ctaUrl: "/about",
        showLatestUpdatesBelow: true,
      });

      vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([mockItem()]);
      vi.spyOn(operations, "getTopPinnedUpdate").mockResolvedValue(null);

      render(
        <MemoryRouter>
          <Index />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Both sections must be present
        expect(screen.getByLabelText("Promotional Video Showcase")).toBeInTheDocument();
        expect(screen.getByLabelText("Latest Updates and Announcements")).toBeInTheDocument();
        expect(screen.getByText("What's Happening Across Our Community")).toBeInTheDocument();
      });
    });

    it("starts embedded playback without opening a modal", async () => {
      const mockSettings: HomepageShowcaseSettings = {
        mode: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "Impact in Action",
        videoDescription: "A short documentary on our programs.",
        thumbnailUrl: "",
        ctaText: "Learn More",
        ctaUrl: "/about",
        showLatestUpdatesBelow: false,
      };

      render(<MemoryRouter><PromotionalVideoShowcase settings={mockSettings} /></MemoryRouter>);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const playCard = screen.getByRole("button", { name: /Play promotional video: Impact in Action/i });
      fireEvent.click(playCard);

      expect(screen.getByTitle("Impact in Action")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTitle("Impact in Action")).not.toBeInTheDocument();
    });

    it("omits the CTA button when ctaText or ctaUrl is empty", () => {
      const mockSettingsWithoutCta: HomepageShowcaseSettings = {
        mode: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "No CTA Showcase",
        videoDescription: "Description here.",
        thumbnailUrl: "",
        ctaText: "",
        ctaUrl: "",
        showLatestUpdatesBelow: false,
      };

      render(
        <MemoryRouter>
          <PromotionalVideoShowcase settings={mockSettingsWithoutCta} />
        </MemoryRouter>
      );

      expect(screen.queryByText("Discover Our Mission")).not.toBeInTheDocument();
    });
  });

  describe("Admin HomepageShowcaseManager Controls", () => {
    it("allows administrators to toggle between Mode A and Mode B and save settings", async () => {
      vi.spyOn(operations, "getHomepageShowcaseSettings").mockResolvedValue({
        mode: "updates",
        videoUrl: "",
        videoTitle: "Beyond awareness. Into impact.",
        videoDescription: "Discover who we are.",
        thumbnailUrl: "",
        ctaText: "Discover Our Mission",
        ctaUrl: "/about",
        showLatestUpdatesBelow: false,
      });

      const updateSpy = vi.spyOn(operations, "updateHomepageShowcaseSettings").mockResolvedValue();

      render(
        <MemoryRouter>
          <HomepageShowcaseManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Showcase Display Mode")).toBeInTheDocument();
        expect(screen.getByText(/Mode A: Latest Updates/i)).toBeInTheDocument();
        expect(screen.getByText(/Mode B: Promotional Video/i)).toBeInTheDocument();
      });

      // Switch to Mode B (Promotional Video)
      const videoModeCard = screen.getByText(/Mode B: Promotional Video/i).closest('[role="button"]')!;
      fireEvent.click(videoModeCard);

      // Verify that promotional video settings fields appear
      await waitFor(() => {
        expect(screen.getByText("Promotional Video Settings")).toBeInTheDocument();
        expect(screen.getByText("1. Video Source")).toBeInTheDocument();
        expect(screen.getByText("2. Section Headline")).toBeInTheDocument();
        expect(screen.getByText("Show Latest Updates Below Showcase")).toBeInTheDocument();
      });

      // Change headline
      const headlineInput = screen.getByDisplayValue("Beyond awareness. Into impact.");
      fireEvent.change(headlineInput, { target: { value: "New Community Vision 2027" } });

      // Save Changes
      const saveBtn = screen.getByText("Save Showcase Changes");
      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "video",
            videoTitle: "New Community Vision 2027",
          })
        );
      });
    });

    it("falls back gracefully when settings fetch fails", async () => {
      vi.spyOn(operations, "getHomepageShowcaseSettings").mockRejectedValue(
        new Error("Network connection lost")
      );

      render(
        <MemoryRouter>
          <HomepageShowcaseManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Should fall back to default configuration without throwing or crashing
        expect(screen.getByText("Showcase Display Mode")).toBeInTheDocument();
      });
    });
  });
});
