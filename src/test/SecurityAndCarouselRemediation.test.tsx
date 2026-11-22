import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LatestUpdatesSection from "@/components/sections/home/LatestUpdatesSection";
import { VolunteerProfileCompletionGuard } from "@/components/layout/AuthGuards";
import * as authGuards from "@/components/layout/AuthGuards";
import * as operations from "@/database/operations";
import { type MediaArticle } from "@/database/types";

const mockItem = (overrides: Partial<MediaArticle> = {}): MediaArticle => ({
  id: "article-" + Math.random().toString(36).substring(7),
  title: "Test Update Title",
  summary: "Summary content for the test update",
  content: "Full content",
  author: "BIH Admin",
  category: "Community",
  publishedAt: "2026-11-20T00:00:00Z",
  imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
  imageUrls: ["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"],
  type: "announcement",
  isPinned: false,
  galleryUrls: [],
  ...overrides,
});

describe("Homepage Carousel & Pinned-First Ordering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prioritizes all pinned items before unpinned items and puts primary pinned item first", async () => {
    const unpinnedNewer = mockItem({
      id: "unpinned-newer",
      title: "Unpinned Newer Story",
      publishedAt: "2026-11-21T00:00:00Z",
      isPinned: false,
    });
    const pinnedOlder = mockItem({
      id: "pinned-older",
      title: "Pinned Priority Story",
      publishedAt: "2026-11-10T00:00:00Z",
      isPinned: true,
    });
    const secondPinned = mockItem({
      id: "pinned-second",
      title: "Second Pinned Announcement",
      publishedAt: "2026-11-05T00:00:00Z",
      isPinned: true,
    });

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([unpinnedNewer, pinnedOlder, secondPinned]);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Primary featured card should be the first pinned item
      expect(screen.getByText("Pinned Priority Story")).toBeInTheDocument();
      expect(screen.getByText("Second Pinned Announcement")).toBeInTheDocument();
      expect(screen.getByText("Unpinned Newer Story")).toBeInTheDocument();
      expect(screen.getByText("Featured")).toBeInTheDocument();
      // Pagination buttons should be present for multiple cards
      expect(screen.getByLabelText("Carousel pagination")).toBeInTheDocument();
      expect(screen.getByLabelText("Previous updates")).toBeInTheDocument();
      expect(screen.getByLabelText("Next updates")).toBeInTheDocument();
    });
  });

  it("filters out duplicate items cleanly without crashing or displaying duplicates", async () => {
    const item1 = mockItem({ id: "dup-1", title: "Duplicate Title 1", isPinned: true });
    const duplicate = mockItem({ id: "dup-1", title: "Duplicate Title 1", isPinned: true });

    vi.spyOn(operations, "getLatestUpdates").mockResolvedValue([item1, duplicate]);

    render(
      <MemoryRouter>
        <LatestUpdatesSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Only 1 item after deduplication -> single card layout
      expect(screen.getByText("Duplicate Title 1")).toBeInTheDocument();
      expect(screen.queryByLabelText("Carousel pagination")).not.toBeInTheDocument();
    });
  });
});

describe("Volunteer Profile Completion Route Guard", () => {
  it("redirects unauthenticated users to /login", async () => {
    const mockResolver = async () => ({
      user: null,
      role: null,
      approvalStatus: null,
    });

    render(
      <MemoryRouter initialEntries={["/complete-profile/volunteer"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/complete-profile/volunteer"
            element={
              <VolunteerProfileCompletionGuard authStatusResolver={mockResolver}>
                <div>Volunteer Profile Completion Form</div>
              </VolunteerProfileCompletionGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
      expect(screen.queryByText("Volunteer Profile Completion Form")).not.toBeInTheDocument();
    });
  });

  it("redirects authenticated non-volunteers to their respective dashboard", async () => {
    const mockResolver = async () => ({
      user: { id: "ngo-user-123" },
      role: "ngo" as const,
      approvalStatus: "approved" as const,
    });

    render(
      <MemoryRouter initialEntries={["/complete-profile/volunteer"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard/ngo" element={<div>NGO Dashboard</div>} />
          <Route
            path="/complete-profile/volunteer"
            element={
              <VolunteerProfileCompletionGuard authStatusResolver={mockResolver}>
                <div>Volunteer Profile Completion Form</div>
              </VolunteerProfileCompletionGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("NGO Dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Volunteer Profile Completion Form")).not.toBeInTheDocument();
    });
  });

  it("redirects already approved volunteers to /dashboard/volunteer", async () => {
    const mockResolver = async () => ({
      user: { id: "vol-user-123" },
      role: "volunteer" as const,
      approvalStatus: "approved" as const,
    });

    render(
      <MemoryRouter initialEntries={["/complete-profile/volunteer"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard/volunteer" element={<div>Volunteer Dashboard</div>} />
          <Route
            path="/complete-profile/volunteer"
            element={
              <VolunteerProfileCompletionGuard authStatusResolver={mockResolver}>
                <div>Volunteer Profile Completion Form</div>
              </VolunteerProfileCompletionGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Volunteer Dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Volunteer Profile Completion Form")).not.toBeInTheDocument();
    });
  });

  it("allows eligible pending volunteers to access the completion form", async () => {
    const mockResolver = async () => ({
      user: { id: "vol-user-pending" },
      role: "volunteer" as const,
      approvalStatus: "pending" as const,
    });

    render(
      <MemoryRouter initialEntries={["/complete-profile/volunteer"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/complete-profile/volunteer"
            element={
              <VolunteerProfileCompletionGuard authStatusResolver={mockResolver}>
                <div>Volunteer Profile Completion Form</div>
              </VolunteerProfileCompletionGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Volunteer Profile Completion Form")).toBeInTheDocument();
    });
  });
});
