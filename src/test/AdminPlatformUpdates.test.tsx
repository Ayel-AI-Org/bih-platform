import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminMediaPage from "@/pages/admin/AdminMediaPage";
import { supabase } from "@/database/client";

const mockArticles = [
  {
    id: "art-1",
    title: "Annual Community Tree Planting Campaign Across Accra Suburbs",
    summary: "Over 500 indigenous seedlings planted with community volunteers.",
    content: "Full detailed report of the tree planting campaign...",
    author: "Grace Mensah",
    category: "Environment",
    image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800",
    full_story_url: "https://example.com/trees",
    published_at: "2026-11-15",
    is_published: true,
    type: "announcement",
    is_pinned: true,
    gallery_urls: ["https://example.com/g1.jpg"],
    attachment_url: "https://example.com/report.pdf",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    created_at: "2026-11-15T10:00:00Z",
  },
  {
    id: "art-2",
    title: "Youth Tech Skills Workshop 2026",
    summary: "Hands-on coding and digital literacy for high school students.",
    content: "Schedule and agenda for the youth digital workshop...",
    author: "Kwame Boateng",
    category: "Education",
    image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800",
    full_story_url: "",
    published_at: null,
    is_published: false,
    type: "event",
    event_date: "2026-12-10T09:00:00Z",
    event_location: "Legon Campus Computer Lab",
    event_link: "https://example.com/workshop",
    is_pinned: false,
    gallery_urls: [],
    created_at: "2026-11-18T14:30:00Z",
  },
  {
    id: "art-3",
    title: "Healthcare Outreach Documentary Video",
    summary: "Short film documenting free medical screening in rural clinics.",
    content: "Video documentation of healthcare outreach...",
    author: "Ama Serwaa",
    category: "Healthcare",
    image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    full_story_url: "",
    published_at: "2026-11-19",
    is_published: true,
    type: "media",
    is_pinned: false,
    gallery_urls: [],
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    created_at: "2026-11-19T08:00:00Z",
  },
];

describe("Admin Platform Updates Page UX Refinements", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => ({
        order: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
      })),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: "art-1" }], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: "art-1" }], error: null }),
        }),
      }),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the refined table columns without a dedicated pin column", async () => {
    render(
      <BrowserRouter>
        <AdminMediaPage />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Platform Updates")).toBeInTheDocument();
    });

    // Check table headers
    const tableHeaders = screen.getAllByRole("columnheader").map((th) => th.textContent?.trim());
    expect(tableHeaders).toContain("Title");
    expect(tableHeaders).toContain("Type");
    expect(tableHeaders).toContain("Category & Timing");
    expect(tableHeaders).toContain("Author");
    expect(tableHeaders).toContain("Visibility");
    expect(tableHeaders).toContain("Actions");

    // The dedicated "Pin" column header should NOT exist anymore
    expect(tableHeaders).not.toContain("Pin");
  });

  it("renders titles with accessible click-to-preview and subtle pinned indicator", async () => {
    render(
      <BrowserRouter>
        <AdminMediaPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Annual Community Tree Planting Campaign Across Accra Suburbs").length).toBeGreaterThan(0);
    });

    // Pinned article has a subtle pin button/indicator (in both desktop table and mobile card)
    const unpinBtns = screen.getAllByRole("button", { name: /unpin update/i });
    expect(unpinBtns.length).toBeGreaterThan(0);

    // Clicking the title opens the Preview dialog
    const titleBtns = screen.getAllByRole("button", {
      name: "Annual Community Tree Planting Campaign Across Accra Suburbs",
    });
    fireEvent.click(titleBtns[0]);

    // Preview dialog should open
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Over 500 indigenous seedlings planted/i)).toBeInTheDocument();
    expect(screen.getByText(/Full detailed report of the tree planting campaign/i)).toBeInTheDocument();

    // Close preview
    const closeBtns = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeBtns[0]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("reduces action-column clutter with Preview, Edit, and overflow menu for Delete", async () => {
    render(
      <BrowserRouter>
        <AdminMediaPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Annual Community Tree Planting Campaign Across Accra Suburbs").length).toBeGreaterThan(0);
    });

    // Preview and Edit buttons should exist
    const previewButtons = screen.getAllByRole("button", { name: /preview "/i });
    expect(previewButtons.length).toBeGreaterThan(0);

    const editLinks = screen.getAllByRole("link", { name: /edit "/i });
    expect(editLinks.length).toBeGreaterThan(0);

    // Delete button should NOT be directly visible in the row
    expect(screen.queryByTitle("Delete update")).not.toBeInTheDocument();

    // Open overflow menu for first article using keyboard or pointer
    const moreOptionsBtns = screen.getAllByRole("button", { name: /more options for "/i });
    expect(moreOptionsBtns.length).toBeGreaterThan(0);

    fireEvent.keyDown(moreOptionsBtns[0], { key: "Enter", code: "Enter" });

    // Dropdown menu should show Delete update and pin/publish options
    const deleteOption = await screen.findByRole("menuitem", { name: /delete update/i });
    expect(deleteOption).toBeInTheDocument();

    // Clicking delete option opens confirmation dialog
    fireEvent.click(deleteOption);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm Deletion")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Update" })).toBeInTheDocument();
  });

  it("filters updates properly by status and search query", async () => {
    render(
      <BrowserRouter>
        <AdminMediaPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Annual Community Tree Planting Campaign Across Accra Suburbs").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Youth Tech Skills Workshop 2026").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Healthcare Outreach Documentary Video").length).toBeGreaterThan(0);
    });

    // Filter by Drafts
    const draftFilterBtn = screen.getByRole("button", { name: /drafts \(1\)/i });
    fireEvent.click(draftFilterBtn);

    // Only Youth Tech Skills Workshop (draft) should be visible
    expect(screen.getAllByText("Youth Tech Skills Workshop 2026").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Annual Community Tree Planting Campaign Across Accra Suburbs").length).toBe(0);

    // Filter by Published
    const publishedFilterBtn = screen.getByRole("button", { name: /published \(2\)/i });
    fireEvent.click(publishedFilterBtn);

    expect(screen.getAllByText("Annual Community Tree Planting Campaign Across Accra Suburbs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Healthcare Outreach Documentary Video").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Youth Tech Skills Workshop 2026").length).toBe(0);

    // Search filter
    const searchInput = screen.getByPlaceholderText(/search title, category, author/i);
    fireEvent.change(searchInput, { target: { value: "healthcare" } });

    expect(screen.getAllByText("Healthcare Outreach Documentary Video").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Annual Community Tree Planting Campaign Across Accra Suburbs").length).toBe(0);
  });
});
