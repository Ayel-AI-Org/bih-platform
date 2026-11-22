import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { VOLUNTEER_REJECTION_REASONS } from "@/pages/admin/AdminUsersPage";
import { PROJECT_REJECTION_REASONS } from "@/pages/admin/AdminSuggestionsPage";
import { TOAST_DEFAULT_DURATION, TOAST_DESTRUCTIVE_DURATION } from "@/hooks/use-toast";
import { ConsentProvider } from "@/context/ConsentContext";
import Footer from "@/components/layout/Footer";

describe("Post-Meeting Enhancements & Configuration", () => {
  it("provides comprehensive standardized volunteer rejection reasons with an Other option", () => {
    expect(VOLUNTEER_REJECTION_REASONS.length).toBeGreaterThanOrEqual(5);
    expect(VOLUNTEER_REJECTION_REASONS).toContain("Incomplete application");
    expect(VOLUNTEER_REJECTION_REASONS).toContain("Information could not be verified");
    expect(VOLUNTEER_REJECTION_REASONS).toContain("Eligibility requirements not met");
    expect(VOLUNTEER_REJECTION_REASONS).toContain("Application does not currently align with organizational needs");
    expect(VOLUNTEER_REJECTION_REASONS).toContain("Duplicate application");
    expect(VOLUNTEER_REJECTION_REASONS).toContain("Other");
  });

  it("provides comprehensive standardized project proposal rejection reasons with an Other option", () => {
    expect(PROJECT_REJECTION_REASONS.length).toBeGreaterThanOrEqual(5);
    expect(PROJECT_REJECTION_REASONS).toContain("Incomplete project proposal");
    expect(PROJECT_REJECTION_REASONS).toContain("Insufficient supporting information");
    expect(PROJECT_REJECTION_REASONS).toContain("Proposal does not align with BIH's mission or current priorities");
    expect(PROJECT_REJECTION_REASONS).toContain("Insufficient feasibility information");
    expect(PROJECT_REJECTION_REASONS).toContain("Proposal requires further development");
    expect(PROJECT_REJECTION_REASONS).toContain("Other");
  });

  it("configures extended toast notification durations within required thresholds", () => {
    // Standard / success / info must be between 4,000 and 5,000 ms
    expect(TOAST_DEFAULT_DURATION).toBeGreaterThanOrEqual(4000);
    expect(TOAST_DEFAULT_DURATION).toBeLessThanOrEqual(5000);

    // Destructive / error must be between 6,000 and 8,000 ms
    expect(TOAST_DESTRUCTIVE_DURATION).toBeGreaterThanOrEqual(6000);
    expect(TOAST_DESTRUCTIVE_DURATION).toBeLessThanOrEqual(8000);
  });

  it("displays verified official contact details in the footer", () => {
    render(
      <MemoryRouter>
        <ConsentProvider>
          <Footer />
        </ConsentProvider>
      </MemoryRouter>
    );

    // Phone number should be +233 (0) 57 880 9478 with clickable tel: link
    const phoneLink = screen.getByRole("link", { name: /\+233 \(0\) 57 880 9478/i });
    expect(phoneLink).toHaveAttribute("href", "tel:+233578809478");

    // Email link
    const emailLink = screen.getByRole("link", { name: /bridgeforimpacthub@gmail\.com/i });
    expect(emailLink).toHaveAttribute("href", "mailto:bridgeforimpacthub@gmail.com");

    // Location should be Accra, Ghana
    expect(screen.getByText("Accra, Ghana")).toBeInTheDocument();
  });
});
