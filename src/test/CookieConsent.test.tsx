import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ConsentProvider, CONSENT_STORAGE_KEY, CONSENT_VERSION, useConsent } from "@/context/ConsentContext";
import CookieConsentBanner from "@/components/consent/CookieConsentBanner";
import CookiePreferencesModal from "@/components/consent/CookiePreferencesModal";
import GatedAnalytics from "@/components/analytics/GatedAnalytics";
import Footer from "@/components/layout/Footer";

// Mock @vercel/analytics/react
vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics-mock">Vercel Analytics Active</div>,
}));

// Helper component to inspect consent state in tests
const TestConsentConsumer = () => {
  const { hasResponded, categories, isPreferencesOpen, openPreferences, withdrawConsent } = useConsent();
  return (
    <div>
      <span data-testid="has-responded">{String(hasResponded)}</span>
      <span data-testid="analytics-consented">{String(categories.analytics)}</span>
      <span data-testid="essential-consented">{String(categories.essential)}</span>
      <span data-testid="prefs-open">{String(isPreferencesOpen)}</span>
      <button data-testid="trigger-open-prefs" onClick={openPreferences}>Open Prefs</button>
      <button data-testid="trigger-withdraw" onClick={withdrawConsent}>Withdraw Consent</button>
    </div>
  );
};

const renderWithContext = () => {
  return render(
    <BrowserRouter>
      <ConsentProvider>
        <GatedAnalytics />
        <CookieConsentBanner />
        <CookiePreferencesModal />
        <TestConsentConsumer />
        <Footer />
      </ConsentProvider>
    </BrowserRouter>
  );
};

describe("BIH Privacy & Cookie Consent Experience", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("shows the first-visit banner when no consent is stored and gates analytics", () => {
    renderWithContext();

    // Banner should be visible
    expect(screen.getByRole("region", { name: /privacy and cookie consent/i })).toBeInTheDocument();
    expect(screen.getByText(/Your privacy matters to/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject optional/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /customize/i })).toBeInTheDocument();

    // State checks
    expect(screen.getByTestId("has-responded").textContent).toBe("false");
    expect(screen.getByTestId("analytics-consented").textContent).toBe("false");
    expect(screen.getByTestId("essential-consented").textContent).toBe("true");

    // Analytics must NOT be loaded before consent
    expect(screen.queryByTestId("vercel-analytics-mock")).not.toBeInTheDocument();
  });

  it("handles 'Accept all' correctly: persists choice, enables analytics, hides banner", async () => {
    renderWithContext();

    const acceptBtn = screen.getByRole("button", { name: /accept all/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /privacy and cookie consent/i })).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("has-responded").textContent).toBe("true");
    expect(screen.getByTestId("analytics-consented").textContent).toBe("true");
    expect(screen.getByTestId("vercel-analytics-mock")).toBeInTheDocument();

    // Verify localStorage
    const saved = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || "{}");
    expect(saved.version).toBe(CONSENT_VERSION);
    expect(saved.hasResponded).toBe(true);
    expect(saved.categories.essential).toBe(true);
    expect(saved.categories.analytics).toBe(true);
  });

  it("handles 'Reject optional' correctly: persists choice, blocks analytics, hides banner", async () => {
    renderWithContext();

    const rejectBtn = screen.getByRole("button", { name: /reject optional/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /privacy and cookie consent/i })).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("has-responded").textContent).toBe("true");
    expect(screen.getByTestId("analytics-consented").textContent).toBe("false");
    expect(screen.getByTestId("essential-consented").textContent).toBe("true");
    expect(screen.queryByTestId("vercel-analytics-mock")).not.toBeInTheDocument();

    // Verify localStorage
    const saved = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || "{}");
    expect(saved.hasResponded).toBe(true);
    expect(saved.categories.analytics).toBe(false);
  });

  it("opens the customize modal from the banner, keeps essential locked, and allows custom toggle", async () => {
    renderWithContext();

    const customizeBtn = screen.getByRole("button", { name: /customize/i });
    fireEvent.click(customizeBtn);

    // Modal opens
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Cookie & Privacy Preferences/i)).toBeInTheDocument();

    // Essential switch is disabled
    const essentialSwitch = screen.getByLabelText(/essential technologies/i);
    expect(essentialSwitch).toBeDisabled();

    // Analytics switch is toggleable
    const analyticsSwitch = screen.getByLabelText(/toggle optional analytics/i);
    expect(analyticsSwitch).not.toBeDisabled();
    expect(analyticsSwitch).not.toBeChecked();

    // Toggle analytics switch
    fireEvent.click(analyticsSwitch);
    expect(analyticsSwitch).toBeChecked();

    // Click Save Preferences
    const saveBtn = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /privacy and cookie consent/i })).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("has-responded").textContent).toBe("true");
    expect(screen.getByTestId("analytics-consented").textContent).toBe("true");
    expect(screen.getByTestId("vercel-analytics-mock")).toBeInTheDocument();
  });

  it("supports revisiting preferences and withdrawing consent from the permanent footer control", async () => {
    // Start with consent already granted
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        hasResponded: true,
        categories: { essential: true, analytics: true },
        timestamp: new Date().toISOString(),
      })
    );

    renderWithContext();

    // Banner is not shown
    expect(screen.queryByRole("region", { name: /privacy and cookie consent/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("vercel-analytics-mock")).toBeInTheDocument();

    // Find Cookie Preferences button in footer
    const footerPrefsBtn = screen.getByRole("button", { name: /manage cookie and privacy preferences/i });
    expect(footerPrefsBtn).toBeInTheDocument();

    fireEvent.click(footerPrefsBtn);

    // Dialog opens
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // Click "Reject Optional" to withdraw consent
    const rejectBtn = screen.getByRole("button", { name: /reject optional/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Analytics is now deactivated
    expect(screen.getByTestId("analytics-consented").textContent).toBe("false");
    expect(screen.queryByTestId("vercel-analytics-mock")).not.toBeInTheDocument();
  });

  it("safely resets and reprompts when stored consent version is outdated or corrupted", () => {
    // Stored version is 0 (outdated)
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        hasResponded: true,
        categories: { essential: true, analytics: true },
      })
    );

    renderWithContext();

    // Banner should reappear because version is outdated
    expect(screen.getByRole("region", { name: /privacy and cookie consent/i })).toBeInTheDocument();
    expect(screen.getByTestId("has-responded").textContent).toBe("false");
    expect(screen.queryByTestId("vercel-analytics-mock")).not.toBeInTheDocument();
  });
});
