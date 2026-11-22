import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjectsSection from "@/components/sections/home/ProjectsSection";
import { supabase } from "@/database/client";

const mockProjects = [
  {
    id: "proj-1",
    title: "Accra Clean Water Well Installation",
    description: "Drilling solar-powered community wells to provide clean water.",
    location: "Accra, Greater Accra",
    category: "WASH",
    status: "ongoing",
    timeline: "Jan 2026 - Dec 2026",
    image_url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80",
    partners: ["Global Water NGO", "Accra Youth Hub"],
  },
  {
    id: "proj-2",
    title: "Kumasi Tree Planting & Afforestation",
    description: "Planting native trees to combat deforestation.",
    location: "Kumasi, Ashanti Region",
    category: "Environment",
    status: "proposed",
    timeline: "Mar 2026 - Jun 2026",
    image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=700&q=80",
    partners: ["Green Earth Ghana"],
  },
  {
    id: "proj-3",
    title: "Tamale Digital Literacy Lab",
    description: "Renovating a municipal library with 40 solar-powered computers.",
    location: "Tamale, Northern Region",
    category: "Education",
    status: "completed",
    timeline: "Nov 2025 - Feb 2026",
    image_url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=700&q=80",
    partners: ["Code For Ghana"],
  },
  {
    id: "proj-4",
    title: "Cape Coast Youth Skills Workshop",
    description: "Vocational skills training for underprivileged youth.",
    location: "Cape Coast, Central Region",
    category: "Livelihoods",
    status: "ongoing",
    timeline: "Apr 2026 - Ongoing",
    image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=700&q=80",
    partners: [],
  },
];

describe("Homepage ProjectsSection Carousel Component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the section header and featured projects in a responsive carousel track", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        }),
      }),
    } as any);

    render(
      <MemoryRouter>
        <ProjectsSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Our Work")).toBeInTheDocument();
      expect(screen.getByText("Featured Projects")).toBeInTheDocument();
      expect(screen.getByText("Accra Clean Water Well Installation")).toBeInTheDocument();
      expect(screen.getByText("Kumasi Tree Planting & Afforestation")).toBeInTheDocument();
      expect(screen.getByText("Tamale Digital Literacy Lab")).toBeInTheDocument();
      expect(screen.getByText("Cape Coast Youth Skills Workshop")).toBeInTheDocument();
    });

    // Check carousel track accessibility and snap classes
    const track = screen.getByLabelText("Featured projects carousel track");
    expect(track).toHaveClass("flex", "items-stretch", "overflow-x-auto", "snap-x", "snap-mandatory");

    // Check that card slides have self-stretch and h-auto to equalize height
    const cardTitle = screen.getByText("Accra Clean Water Well Installation");
    const cardElement = cardTitle.closest(".snap-start");
    expect(cardElement).toHaveClass("self-stretch", "h-auto", "flex", "flex-col", "justify-between");

    // Check title line-clamp-2 and description line-clamp-3
    expect(cardTitle).toHaveClass("line-clamp-2");
    const cardDescription = screen.getByText("Drilling solar-powered community wells to provide clean water.");
    expect(cardDescription).toHaveClass("line-clamp-3");

    // Check desktop navigation controls when projects > 3
    expect(screen.getByLabelText("Previous projects")).toBeInTheDocument();
    expect(screen.getByLabelText("Next projects")).toBeInTheDocument();

    // Check pagination dots container
    expect(screen.getByLabelText("Projects pagination")).toBeInTheDocument();
  });

  it("renders high-contrast frosted status badges on cover images", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [mockProjects[0], mockProjects[1]], error: null }),
        }),
      }),
    } as any);

    render(
      <MemoryRouter>
        <ProjectsSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Ongoing status pill
      const ongoingBadge = screen.getByText("Ongoing");
      expect(ongoingBadge).toBeInTheDocument();
      expect(ongoingBadge).toHaveClass("bg-slate-900/85", "text-white", "backdrop-blur-md");

      // Pending status pill
      const pendingBadge = screen.getByText("Pending");
      expect(pendingBadge).toBeInTheDocument();
      expect(pendingBadge).toHaveClass("bg-slate-900/85", "text-white", "backdrop-blur-md");
    });
  });

  it("handles empty projects state gracefully", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as any);

    render(
      <MemoryRouter>
        <ProjectsSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Our Work")).toBeInTheDocument();
      expect(screen.getByText("Featured Projects")).toBeInTheDocument();
      expect(screen.getByText(/No published projects yet/i)).toBeInTheDocument();
      expect(screen.queryByLabelText("Featured projects carousel track")).not.toBeInTheDocument();
    });
  });

  it("renders 'Learn More' buttons with equal height structure", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockProjects.slice(0, 3), error: null }),
        }),
      }),
    } as any);

    render(
      <MemoryRouter>
        <ProjectsSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      const learnMoreLinks = screen.getAllByRole("link", { name: /Learn More/i });
      expect(learnMoreLinks).toHaveLength(3);
      expect(learnMoreLinks[0]).toHaveAttribute("href", "/projects/proj-1");
      expect(learnMoreLinks[1]).toHaveAttribute("href", "/projects/proj-2");
      expect(learnMoreLinks[2]).toHaveAttribute("href", "/projects/proj-3");
    });
  });
});
