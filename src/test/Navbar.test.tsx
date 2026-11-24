import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";

describe("Navbar Component", () => {
  beforeEach(() => {
    // Reset body style
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the BIH logo, brand title, desktop links, and CTA buttons", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    // Verify logo
    const logos = screen.getAllByAltText("Bridge for Impact Hub Logo");
    expect(logos.length).toBeGreaterThan(0);

    // Verify brand name
    expect(screen.getAllByText(/Bridge for/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Impact/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hub/i).length).toBeGreaterThan(0);

    // Verify desktop links
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "About" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Projects" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Suggest Project" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Media" }).length).toBeGreaterThan(0);

    // Verify Donate CTAs (both desktop & mobile)
    const donateLinks = screen.getAllByRole("link", { name: "Donate" });
    expect(donateLinks.length).toBeGreaterThanOrEqual(1);
    expect(donateLinks[0]).toHaveAttribute("href", "/donate");

    // Verify Sign In CTA
    const signInLinks = screen.getAllByRole("link", { name: "Sign In" });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute("href", "/login");
  });

  it("applies active indicator only to exact match for home route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const homeLinks = screen.getAllByRole("link", { name: "Home" });
    const projectsLinks = screen.getAllByRole("link", { name: "Projects" });

    // Home link should have active class font-semibold
    expect(homeLinks[0]).toHaveClass("font-semibold");
    // Projects link should not be font-semibold
    expect(projectsLinks[0]).not.toHaveClass("font-semibold");
  });

  it("applies active indicator to projects route when navigated", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Navbar />
      </MemoryRouter>
    );

    const homeLinks = screen.getAllByRole("link", { name: "Home" });
    const projectsLinks = screen.getAllByRole("link", { name: "Projects" });

    expect(homeLinks[0]).not.toHaveClass("font-semibold");
    expect(projectsLinks[0]).toHaveClass("font-semibold");
  });

  it("toggles mobile drawer open and closed via hamburger and close buttons", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");

    // Click hamburger to open
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");

    // Close via close button (X)
    const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
    fireEvent.click(closeBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile drawer when Escape key is pressed", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile drawer when a mobile link is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<Navbar />} />
        </Routes>
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    // Click "Suggest Project"
    const suggestLinks = screen.getAllByRole("link", { name: "Suggest Project" });
    fireEvent.click(suggestLinks[suggestLinks.length - 1]);

    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("updates appearance on window scroll", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    // Scroll window
    window.scrollY = 50;
    fireEvent.scroll(window);

    expect(header).toHaveClass("shadow-md");

    // Scroll back up
    window.scrollY = 0;
    fireEvent.scroll(window);

    expect(header).toHaveClass("shadow-xs");
  });
});
