import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import { supabase } from "@/database/client";

vi.mock("@/database/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe("AdminOverviewPage Refinement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders refined heading, secondary send summaries action, 4 primary metrics, and dashboard sections", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.count === "exact") {
              return Promise.resolve({ count: 48, error: null });
            }
            return {
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { id: "p1", full_name: "Ama Mensah", role: "volunteer", created_at: "2026-11-20T10:00:00Z" },
                  ],
                  error: null,
                }),
              }),
            };
          }),
        };
      }
      if (table === "volunteer_profiles" || table === "ngo_profiles" || table === "donor_profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_col, _val) => {
              return {
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                count: 1,
                error: null,
              };
            }),
          }),
        };
      }
      if (table === "projects") {
        return {
          select: vi.fn().mockReturnValue({
            data: [
              { id: "pr1", status: "ongoing", title: "Legon Green Campus", created_at: "2026-11-19T09:00:00Z" },
              { id: "pr2", status: "completed", title: "Tema Water Pipeline", created_at: "2026-11-18T08:00:00Z" },
              { id: "pr3", status: "proposed", title: "Kumasi Library", created_at: "2026-11-17T07:00:00Z" },
            ],
            error: null,
          }),
        };
      }
      if (table === "donations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: "don1", full_name: "Kofi Annan", amount: 1500, created_at: "2026-11-20T11:00:00Z" },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "portfolio_entries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      if (table === "project_suggestions") {
        return {
          select: vi.fn().mockImplementation(() => {
            return {
              in: vi.fn().mockResolvedValue({ count: 2, error: null }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { id: "sug1", title: "Solar panels for schools", submitted_by: "Dr. Baah", created_at: "2026-11-19T14:00:00Z" },
                  ],
                  error: null,
                }),
              }),
            };
          }),
        };
      }
      return {};
    });

    render(
      <BrowserRouter>
        <AdminOverviewPage />
      </BrowserRouter>
    );

    // Verify heading and refined supporting text
    await waitFor(() => {
      expect(screen.getByText("Administration Overview")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Monitor ecosystem activity, outstanding reviews, and platform health.")
    ).toBeInTheDocument();

    // Verify secondary action button with tour ID
    const sendBtn = screen.getByRole("button", { name: /Send Impact Summaries/i });
    expect(sendBtn).toBeInTheDocument();
    expect(sendBtn.id).toBe("admin-send-summaries-btn");

    // Verify primary metric cards
    expect(screen.getByText("Registered Users")).toBeInTheDocument();
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
    expect(screen.getByText("Fundraising Total")).toBeInTheDocument();
    expect(screen.getByText("Pending Actions")).toBeInTheDocument();

    // Verify Review Queue section
    expect(screen.getByText("Review Queue")).toBeInTheDocument();
    expect(screen.getByText("Registrations")).toBeInTheDocument();
    expect(screen.getByText("Portfolios")).toBeInTheDocument();
    expect(screen.getByText("Suggestions")).toBeInTheDocument();

    // Verify Project Snapshot section
    expect(screen.getByText("Project Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
    expect(screen.getByText("Proposed")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // Verify Recent Activity section
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });
});
