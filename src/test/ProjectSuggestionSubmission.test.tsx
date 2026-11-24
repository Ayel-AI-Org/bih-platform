import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { suggestProject, getSuggestions } from "@/database/operations";
import SuggestProjectPage from "@/pages/public/SuggestProjectPage";
import AdminSuggestionsPage from "@/pages/admin/AdminSuggestionsPage";
import { supabase } from "@/database/client";

vi.mock("@/database/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  };
});

describe("Project Suggestion Submission & Schema Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits proposal successfully for unauthenticated (anonymous) visitors without sending submitter_id", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    let insertedPayload: any = null;
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          insert: vi.fn().mockImplementation((payload) => {
            insertedPayload = payload;
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {};
    });

    await suggestProject({
      title: "Solar Water Pump",
      description: "Providing clean drinking water to village community.",
      location: "Northern Region",
      timeline: "4 months",
      submittedBy: "Kofi Annan",
      email: "kofi@example.com",
      phone: "+233201234567",
      organization: "Community Water Initiative",
      category: "Water & Sanitation",
      expectedBudget: 25000,
      beneficiaries: "1,200 villagers",
    });

    expect(insertedPayload).not.toBeNull();
    expect(insertedPayload.title).toBe("Solar Water Pump");
    expect(insertedPayload.submitted_by).toBe("Kofi Annan");
    expect(insertedPayload.email).toBe("kofi@example.com");
    expect(insertedPayload.expected_budget).toBe(25000);
    // submitter_id should NOT be sent when visitor is unauthenticated
    expect(insertedPayload.submitter_id).toBeUndefined();
  });

  it("submits proposal successfully for authenticated users with submitter_id linked", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "user-uuid-999" } },
      error: null,
    });

    let insertedPayload: any = null;
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          insert: vi.fn().mockImplementation((payload) => {
            insertedPayload = payload;
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {};
    });

    await suggestProject({
      title: "Youth Tech Lab",
      description: "Equipping rural school with refurbished computers.",
      location: "Kumasi",
      timeline: "2 months",
      submittedBy: "Akua Mansa",
      email: "akua@example.com",
      category: "Education",
    });

    expect(insertedPayload).not.toBeNull();
    expect(insertedPayload.submitter_id).toBe("user-uuid-999");
    expect(insertedPayload.submitted_by).toBe("Akua Mansa");
  });

  it("recovers gracefully when PostgREST returns schema cache error for submitter_id", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "user-uuid-999" } },
      error: null,
    });

    const callPayloads: any[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          insert: vi.fn().mockImplementation((payload) => {
            callPayloads.push(payload);
            // First call fails with PostgREST schema cache error
            if (callPayloads.length === 1) {
              return Promise.resolve({
                error: {
                  message: "Could not find the 'submitter_id' column of 'project_suggestions' in the schema cache",
                  code: "PGRST204",
                },
              });
            }
            // Second call (without submitter_id) succeeds
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {};
    });

    // Should NOT throw an exception
    await expect(
      suggestProject({
        title: "Community Library",
        description: "Building reading hub.",
        location: "Cape Coast",
        timeline: "6 months",
        submittedBy: "Kwame Nkrumah",
        email: "kwame@example.com",
      })
    ).resolves.toBeUndefined();

    expect(callPayloads.length).toBe(2);
    // First attempt included submitter_id
    expect(callPayloads[0].submitter_id).toBe("user-uuid-999");
    // Retry omitted submitter_id to bypass unmigrated column / stale schema cache
    expect(callPayloads[1].submitter_id).toBeUndefined();
    expect(callPayloads[1].title).toBe("Community Library");
  });

  it("falls back to core schema fields when extended columns are missing in legacy databases", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const callPayloads: any[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          insert: vi.fn().mockImplementation((payload) => {
            callPayloads.push(payload);
            if (callPayloads.length === 1) {
              return Promise.resolve({
                error: {
                  message: "column 'organization' of relation 'project_suggestions' does not exist",
                },
              });
            }
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {};
    });

    await suggestProject({
      title: "Mangrove Reforestation",
      description: "Restoring coastal wetlands.",
      location: "Ada Foah",
      timeline: "1 year",
      submittedBy: "Esi Mensah",
      email: "esi@example.com",
      organization: "Coastal Care",
      expectedBudget: 50000,
    });

    expect(callPayloads.length).toBe(2);
    // Fallback payload includes core fields and appends organization & budget to description
    expect(callPayloads[1].title).toBe("Mangrove Reforestation");
    expect(callPayloads[1].description).toContain("Restoring coastal wetlands.");
    expect(callPayloads[1].description).toContain("Organization: Coastal Care");
    expect(callPayloads[1].description).toContain("Expected Budget (GHS): 50000");
    expect(callPayloads[1].organization).toBeUndefined();
  });

  it("handles getSuggestions fallback cleanly if schema cache error occurs on extended query", async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols.includes("phone")) {
              return {
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    message: "Could not find the 'phone' column of 'project_suggestions' in the schema cache",
                  },
                }),
              };
            }
            // Fallback select
            return {
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "sug-1",
                    title: "Tree Planting",
                    description: "500 trees in school grounds",
                    location: "Accra",
                    timeline: "1 month",
                    submitted_by: "Ama",
                    email: "ama@example.com",
                    created_at: new Date().toISOString(),
                    status: "pending",
                  },
                ],
                error: null,
              }),
            };
          }),
        };
      }
      return {};
    });

    const suggestions = await getSuggestions();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].title).toBe("Tree Planting");
    expect(suggestions[0].submittedBy).toBe("Ama");
  });

  it("renders SuggestProjectPage and submits form without schema errors", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    render(
      <MemoryRouter>
        <SuggestProjectPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/project title/i), {
      target: { value: "Solar Microgrid" },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "Provide microgrid power to health clinics." },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Volta Region" },
    });
    fireEvent.change(screen.getByLabelText(/timeline/i), {
      target: { value: "Q4 2026" },
    });
    fireEvent.change(screen.getByLabelText(/submitted by/i), {
      target: { value: "Ewura Esi" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "esi@example.com" },
    });

    const submitBtn = screen.getByRole("button", { name: /submit for admin review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("project_suggestions");
    });
  });

  it("renders proposals in AdminSuggestionsPage dossier table", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "project_suggestions") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "sug-101",
                  title: "Clean Water Borehole",
                  description: "Installation of community borehole.",
                  location: "Wa",
                  timeline: "3 months",
                  submitted_by: "Alhassan Baba",
                  submitter_id: "user-123",
                  email: "alhassan@example.com",
                  phone: "+233240001122",
                  category: "Water & Sanitation",
                  expected_budget: 18000,
                  beneficiaries: "800 residents",
                  status: "pending",
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    render(
      <MemoryRouter>
        <AdminSuggestionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const titleMatches = screen.getAllByText("Clean Water Borehole");
      expect(titleMatches.length).toBeGreaterThan(0);
      const authorMatches = screen.getAllByText("Alhassan Baba");
      expect(authorMatches.length).toBeGreaterThan(0);
    });
  });
});
