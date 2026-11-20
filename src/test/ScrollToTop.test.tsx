import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import ScrollToTop from "@/components/layout/ScrollToTop";

describe("ScrollToTop", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();
  });

  it("calls window.scrollTo with top: 0, left: 0, and behavior: 'instant' on route change", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  });

  it("scrolls element into view when hash is provided", () => {
    const targetElement = document.createElement("div");
    targetElement.id = "contact";
    targetElement.scrollIntoView = vi.fn();
    document.body.appendChild(targetElement);

    render(
      <MemoryRouter initialEntries={["/#contact"]}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
    });

    document.body.removeChild(targetElement);
  });
});
