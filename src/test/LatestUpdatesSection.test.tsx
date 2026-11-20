import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LatestUpdatesSection from "@/components/sections/home/LatestUpdatesSection";
import * as operations from "@/database/operations";
import { type MediaArticle } from "@/database/types";

const mockItem = (overrides: Partial<MediaArticle> = {}): MediaArticle => ({
  id: "test-id-" + Math.random().toString(36).substring(7),
  title: "Test Update Title",
  summary: "Test summary description of the update",
  content: "Full content of the update",
  author: "BIH Admin",
  category: "Community",
  publishedAt: "2026-11-20",
  imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  imageUrls: ["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"],
  type: "announcement",
  isPinned: false,
  galleryUrls: [],
  ...overrides,
});

describe("Homepage LatestUpdatesSection Component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles 0 published items gracefully without crashing or disappearing silently", async () => {
    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Latest Updates")).toBeInTheDocument();
      expect(screen.getByText("What's Happening Across Our Community")).toBeInTheDocument();
      expect(screen.getByText(/No published updates or announcements yet/i)).toBeInTheDocument();
    });
  });

  it("renders 1 published item with featured card", async () => {
    const item1 = mockItem({
      title: "Solo Featured Milestone",
      type: "announcement",
      summary: "First single announcement published.",
    });

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([item1]);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Solo Featured Milestone")).toBeInTheDocument();
      expect(screen.getByText("First single announcement published.")).toBeInTheDocument();
      expect(screen.getByText("Read Full Story")).toBeInTheDocument();
    });
  });

  it("renders 2-3 published items (1 featured + 1-2 secondary cards)", async () => {
    const items = [
      mockItem({ id: "1", title: "Primary Featured Update", isPinned: true }),
      mockItem({ id: "2", title: "Secondary Story Two", type: "media" }),
      mockItem({ id: "3", title: "Community Gathering Three", type: "event", eventDate: "2026-12-01T10:00:00Z" }),
    ];

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue(items);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Primary Featured Update")).toBeInTheDocument();
      expect(screen.getByText("Secondary Story Two")).toBeInTheDocument();
      expect(screen.getByText("Community Gathering Three")).toBeInTheDocument();
      expect(screen.getByText("Featured")).toBeInTheDocument();
    });
  });

  it("handles 4 or more published items safely without disappearing or losing content", async () => {
    const items = [
      mockItem({ id: "1", title: "Spotlight Update 1" }),
      mockItem({ id: "2", title: "Secondary Update 2" }),
      mockItem({ id: "3", title: "Secondary Update 3" }),
      mockItem({ id: "4", title: "Excess Update 4" }),
      mockItem({ id: "5", title: "Excess Update 5" }),
    ];

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue(items);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Latest Updates")).toBeInTheDocument();
      expect(screen.getByText("What's Happening Across Our Community")).toBeInTheDocument();
      // Should display top 3 safely
      expect(screen.getByText("Spotlight Update 1")).toBeInTheDocument();
      expect(screen.getByText("Secondary Update 2")).toBeInTheDocument();
      expect(screen.getByText("Secondary Update 3")).toBeInTheDocument();
      // Clear navigation to media page
      expect(screen.getByRole("link", { name: /View all updates/i })).toHaveAttribute("href", "/media");
    });
  });

  it("handles items with missing or null images gracefully using fallback", async () => {
    const itemWithoutImg = mockItem({
      id: "no-img-1",
      title: "Update Without Cover Image",
      imageUrl: "",
    });

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([itemWithoutImg]);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Update Without Cover Image")).toBeInTheDocument();
      const img = screen.getByAltText("Update Without Cover Image") as HTMLImageElement;
      expect(img.src).toContain("photo-1559027615-cd4628902d4a");
    });
  });

  it("handles upcoming and past events correctly with date badges", async () => {
    const eventItem = mockItem({
      id: "ev-1",
      title: "Annual Ecosystem Gala",
      type: "event",
      eventDate: "2026-12-25T18:00:00Z",
    });

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([eventItem]);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Annual Ecosystem Gala")).toBeInTheDocument();
      expect(screen.getByText("Dec")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("View Event Details")).toBeInTheDocument();
    });
  });
});
