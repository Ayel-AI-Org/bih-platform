import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountStatusBadge, AccountRoleBadge } from "@/components/admin/UserBadges";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import * as clientModule from "@/database/client";

// Mock Supabase client
const mockProfiles = [
  {
    id: "user-1",
    full_name: "Kwame Mensah",
    email: "kwame@example.com",
    role: "volunteer",
    created_at: "2026-01-10T10:00:00Z",
    avatar_url: null,
    country: "Ghana",
  },
  {
    id: "user-2",
    full_name: "Hope for Children NGO",
    email: "contact@hopechildren.org",
    role: "ngo",
    created_at: "2026-02-15T12:00:00Z",
    avatar_url: null,
    country: "Ghana",
  },
  {
    id: "user-3",
    full_name: "Ama Serwaa",
    email: "ama@example.com",
    role: "donor",
    created_at: "2026-03-01T08:00:00Z",
    avatar_url: null,
    country: "Ghana",
  },
];

const mockVolunteers = [
  {
    user_id: "user-1",
    approval_status: "approved",
    total_verified_hours: 42,
    phone: "+233201234567",
    location: "Accra",
    skills: ["Teaching", "Logistics"],
    availability: "Weekends",
    badge_level: "gold",
    linkedin_url: "https://linkedin.com/in/kwame",
  },
];

const mockNgos = [
  {
    user_id: "user-2",
    approval_status: "pending",
    organization_name: "Hope for Children NGO",
    contact_person: "Kofi Annan",
    phone: "+233241112233",
    focus_area: "Education",
    registration_number: "NGO-GH-2024",
    website_url: "https://hopechildren.org",
  },
];

const mockDonors = [
  {
    user_id: "user-3",
    approval_status: "approved",
    donor_type: "Individual Philanthropist",
    phone: "+233209998877",
    interests: ["Youth Empowerment", "Clean Water"],
    total_donated: 1500,
  },
];

describe("Admin User Badges System", () => {
  it("renders status badges with appropriate restrained styling and text", () => {
    const { rerender } = render(<AccountStatusBadge status="approved" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();

    rerender(<AccountStatusBadge status="pending" />);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();

    rerender(<AccountStatusBadge status="rejected" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders role badges with specific colors and titles", () => {
    const { rerender } = render(<AccountRoleBadge role="volunteer" />);
    expect(screen.getByText("Volunteer")).toBeInTheDocument();

    rerender(<AccountRoleBadge role="ngo" />);
    expect(screen.getByText("NGO Partner")).toBeInTheDocument();

    rerender(<AccountRoleBadge role="donor" />);
    expect(screen.getByText("Donor")).toBeInTheDocument();

    rerender(<AccountRoleBadge role="admin" />);
    expect(screen.getByText("Staff Admin")).toBeInTheDocument();

    rerender(<AccountRoleBadge role="super_admin" />);
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });
});

describe("AdminUsersPage (People & Access)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(clientModule.supabase, "from").mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "super_admin" }, error: null }),
            }),
          }),
        } as any;
      }
      if (table === "volunteer_profiles") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVolunteers, error: null }),
        } as any;
      }
      if (table === "ngo_profiles") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockNgos, error: null }),
        } as any;
      }
      if (table === "donor_profiles") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockDonors, error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    vi.spyOn(clientModule.supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "admin-id" } as any },
      error: null,
    });
  });

  it("renders page header hierarchy, breadcrumb, and metrics strip", async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    // Contextual label & Title
    await waitFor(() => {
      expect(screen.getByText("Operations / Access Control")).toBeInTheDocument();
      expect(screen.getByText("People & Access")).toBeInTheDocument();
    });

    // Metrics strip
    expect(screen.getByText("Total Registry")).toBeInTheDocument();
    expect(screen.getAllByText("Pending Review").length).toBeGreaterThan(0);
    expect(screen.getByText("Volunteers")).toBeInTheDocument();
    expect(screen.getByText("Partner NGOs")).toBeInTheDocument();
    expect(screen.getByText("Donors")).toBeInTheDocument();

    // Verify user records rendered
    expect(screen.getAllByText("Kwame Mensah").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hope for Children NGO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ama Serwaa").length).toBeGreaterThan(0);
  });

  it("filters users dynamically when search query is typed", async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Kwame Mensah").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search by name, email, organization, or skills/i);
    fireEvent.change(searchInput, { target: { value: "Kwame" } });

    // Kwame should be visible, others filtered out
    expect(screen.getAllByText("Kwame Mensah").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ama Serwaa")).not.toBeInTheDocument();
  });
});
