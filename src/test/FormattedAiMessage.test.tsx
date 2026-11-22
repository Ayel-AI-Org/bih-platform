import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormattedAiMessage from "@/components/layout/FormattedAiMessage";

describe("FormattedAiMessage Markdown Renderer", () => {
  it("renders bold text properly without raw markdown syntax", () => {
    render(<FormattedAiMessage content="Welcome to **Bridge for Impact Hub** in Ghana." />);
    const strongElement = screen.getByText("Bridge for Impact Hub");
    expect(strongElement.tagName).toBe("STRONG");
    expect(screen.queryByText("**Bridge for Impact Hub**")).not.toBeInTheDocument();
  });

  it("renders unordered bullet lists cleanly", () => {
    const listContent = "- Item One\n- Item Two\n* Item Three";
    render(<FormattedAiMessage content={listContent} />);

    expect(screen.getByText("Item One")).toBeInTheDocument();
    expect(screen.getByText("Item Two")).toBeInTheDocument();
    expect(screen.getByText("Item Three")).toBeInTheDocument();
  });

  it("renders ordered numbered lists cleanly", () => {
    const steps = "1. Register on the platform\n2. Fill out profile\n3. Wait for clearance";
    render(<FormattedAiMessage content={steps} />);

    expect(screen.getByText("Register on the platform")).toBeInTheDocument();
    expect(screen.getByText("Fill out profile")).toBeInTheDocument();
    expect(screen.getByText("Wait for clearance")).toBeInTheDocument();
  });

  it("cleans raw markdown tables into structured bullet points without table separator artifacts", () => {
    const tableMarkdown = `
Here is the summary:
| Initiative | Location |
|---|---|
| Clean Water | Accra |
| Tree Planting | Kumasi |
    `.trim();

    render(<FormattedAiMessage content={tableMarkdown} />);

    // Table divider line |---|---| should not be displayed
    expect(screen.queryByText(/\|---\|/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\|---\|---\|/)).not.toBeInTheDocument();

    // The data should be rendered cleanly
    expect(screen.getByText(/Clean Water/)).toBeInTheDocument();
    expect(screen.getByText(/Accra/)).toBeInTheDocument();
  });

  it("renders links and inline code cleanly", () => {
    render(<FormattedAiMessage content="Visit [Suggest Project](/suggest-project) or check `settings`." />);

    const link = screen.getByRole("link", { name: "Suggest Project" });
    expect(link).toHaveAttribute("href", "/suggest-project");
    expect(screen.getByText("settings").tagName).toBe("CODE");
  });
});
