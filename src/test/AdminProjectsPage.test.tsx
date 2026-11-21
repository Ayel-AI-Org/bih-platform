import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectStatusBadge, ProjectCategoryBadge } from "@/components/admin/ProjectBadges";
import AdminProjectsPage from "@/pages/admin/AdminProjectsPage";
import * as clientModule from "@/database/client";

const mockProjects = [
  {
    id: "proj-1",
    title: "Greater Accra Digital Skills Bootcamp",
    description: "Training 500 youth in modern software and digital design skills.",
    location: "Accra, Ghana",
    category: "Education & Skills",
    status: "ongoing",
    timeline: "Jan 2026 - Dec 2026",
    image_url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a",
    partners: ["Tech Ghana", "Ministry of Comms"],
    created_at: "2026-01-05T08:00:00Z",
    completed_at: null,
    completion_summary: null,
    beneficiaries_reached: null,
    gallery_urls: [],
    report_url: null,
  },
  {
    id: "proj-2",
    title: "Northern Region Clean Water Initiative",
    description: "Drilling 12 solar-powered boreholes across rural communities.",
    location: "Tamale, Ghana",
    category: "Water & Sanitation",
    status: "proposed",
    timeline: "Q3 2026 - Q2 2027",
    image_url: "https://images.unsplash.com/photo-1509391366360",
    partners: ["WaterAid Ghana"],
    created_at: "2026-02-10T11:00:00Z",
    completed_at: null,
    completion_summary: null,
    beneficiaries_reached: null,
    gallery_urls: [],
    report_url: null,
  },
  {
    id: "proj-3",
    title: "Bono Region Youth Literacy Project",
    description: "Community library stocking and literacy program.",
    location: "Sunyani, Ghana",
    category: "Education & Skills",
    status: "completed",
    timeline: "Completed 2025",
    image_url: "https://images.unsplash.com/photo-1497633762265",
    partners: ["Ghana Library Authority"],
    created_at: "2025-06-01T09:00:00Z",
    completed_at: "2025-12-15T00:00:00Z",
    completion_summary: "Achieved 100% of community literacy goals.",
    beneficiaries_reached: 1200,
    gallery_urls: [],
    report_url: "https://example.com/report.pdf",
  },
];

describe("ProjectBadges System", () => {
  it("renders status badges with appropriate styles and labels", () => {
    const { rerender } = render(<ProjectStatusBadge status="ongoing" />);
    expect(screen.getByText("Ongoing")).toBeInTheDocument();

    rerender(<ProjectStatusBadge status="proposed" />);
    expect(screen.getByText("Proposed")).toBeInTheDocument();

    rerender(<ProjectStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders category badges when category is provided", () => {
    const { rerender } = render(<ProjectCategoryBadge category="Education & Skills" />);
    expect(screen.getByText("Education & Skills")).toBeInTheDocument();

    rerender(<ProjectCategoryBadge category="" />);
    expect(screen.queryByText("Education & Skills")).not.toBeInTheDocument();
  });
});

describe("AdminProjectsPage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(clientModule.supabase, "from").mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
          }),
        } as any;
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    vi.spyOn(clientModule.supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "admin-user" } as any },
      error: null,
    });
  });

  it("renders refined header, breadcrumb, and operational metrics row", async () => {
    render(
      <MemoryRouter>
        <AdminProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Operations / Cause Initiatives")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    });

    // Check Metrics Strip
    expect(screen.getByText("Total Initiatives")).toBeInTheDocument();
    expect(screen.getAllByText("Ongoing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Proposed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getByText("Impact Reach")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument(); // 1200 beneficiaries from completed project

    // Check Project Items
    expect(screen.getAllByText("Greater Accra Digital Skills Bootcamp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northern Region Clean Water Initiative").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bono Region Youth Literacy Project").length).toBeGreaterThan(0);
  });

  it("filters project records dynamically when search text is entered", async () => {
    render(
      <MemoryRouter>
        <AdminProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Greater Accra Digital Skills Bootcamp").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search initiatives by title, location, sector, or partners/i);
    fireEvent.change(searchInput, { target: { value: "Water" } });

    // Northern Region Clean Water Initiative should remain, others filtered
    expect(screen.getAllByText("Northern Region Clean Water Initiative").length).toBeGreaterThan(0);
    expect(screen.queryByText("Greater Accra Digital Skills Bootcamp")).not.toBeInTheDocument();
  });

  it("filters projects by status tabs", async () => {
    render(
      <MemoryRouter>
        <AdminProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Greater Accra Digital Skills Bootcamp").length).toBeGreaterThan(0);
    });

    // Click Proposed filter button
    const proposedBtn = screen.getByRole("button", { name: /Proposed \(1\)/i });
    fireEvent.click(proposedBtn);

    expect(screen.getAllByText("Northern Region Clean Water Initiative").length).toBeGreaterThan(0);
    expect(screen.queryByText("Greater Accra Digital Skills Bootcamp")).not.toBeInTheDocument();
  });

  it("opens project dossier modal when title is clicked", async () => {
    render(
      <MemoryRouter>
        <AdminProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Greater Accra Digital Skills Bootcamp").length).toBeGreaterThan(0);
    });

    const titleBtns = screen.getAllByRole("button", { name: /Greater Accra Digital Skills Bootcamp/i });
    fireEvent.click(titleBtns[0]);

    // Check dialog opens
    await waitFor(() => {
      expect(screen.getByText("Initiative Description")).toBeInTheDocument();
      expect(screen.getAllByText(/Training 500 youth in modern software and digital design skills/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("button", { name: /Close Dossier/i })).toBeInTheDocument();
    });
  });
});
