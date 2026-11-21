import { describe, it, expect, vi, beforeEach } from "vitest";
import { canDeleteProject, deleteProject } from "@/database/operations";
import { supabase } from "@/database/client";

vi.mock("@/database/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Project Deletion Safeguard Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks deletion when linked volunteer hours (commitment_logs) exist", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "commitment_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
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
      return {};
    });

    const eligibility = await canDeleteProject("proj-123");
    expect(eligibility.canDelete).toBe(false);
    expect(eligibility.linkedHoursCount).toBe(5);
    expect(eligibility.linkedPortfolioCount).toBe(0);
    expect(eligibility.reason).toContain("5 volunteer hour logs");
    expect(eligibility.reason).toContain('Mark the project as "Completed" instead');
  });

  it("blocks deletion when linked portfolio showcase entries exist", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "commitment_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      if (table === "portfolio_entries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        };
      }
      return {};
    });

    const eligibility = await canDeleteProject("proj-456");
    expect(eligibility.canDelete).toBe(false);
    expect(eligibility.linkedHoursCount).toBe(0);
    expect(eligibility.linkedPortfolioCount).toBe(2);
    expect(eligibility.reason).toContain("2 portfolio items");
  });

  it("allows deletion when no linked hours or portfolio records exist", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "commitment_logs" || table === "portfolio_entries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      return {};
    });

    const eligibility = await canDeleteProject("proj-clean");
    expect(eligibility.canDelete).toBe(true);
    expect(eligibility.linkedHoursCount).toBe(0);
    expect(eligibility.linkedPortfolioCount).toBe(0);
    expect(eligibility.reason).toBeUndefined();
  });

  it("deleteProject refuses to execute and throws an error if project has dependencies", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "commitment_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
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
      return {};
    });

    await expect(deleteProject("proj-linked")).rejects.toThrow(
      /cannot be deleted because it is linked to 3 volunteer hour logs/
    );
  });

  it("deleteProject proceeds with supabase deletion when project is clean", async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "commitment_logs" || table === "portfolio_entries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      if (table === "projects") {
        return {
          delete: deleteMock,
        };
      }
      return {};
    });

    await expect(deleteProject("proj-clean")).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalled();
  });
});
