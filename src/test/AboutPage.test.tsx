import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AboutPage from "@/pages/public/AboutPage";
import About from "@/components/sections/home/About";

describe("About BIH Feature", () => {
  describe("Homepage About Preview Section", () => {
    it("renders headline, refined concise paragraph, mission/vision/approach, and 'Learn More About BIH' link", () => {
      render(
        <MemoryRouter>
          <About />
        </MemoryRouter>
      );

      // Verify headline
      expect(
        screen.getByRole("heading", { name: /bridging the gap between goodwill and action/i })
      ).toBeInTheDocument();

      // Verify refined introductory paragraph
      expect(
        screen.getByText(/Bridge for Impact Hub is a social impact organization connecting ideas/i)
      ).toBeInTheDocument();

      // Verify mission, vision, approach items
      expect(screen.getByText("Our Mission")).toBeInTheDocument();
      expect(screen.getByText("Our Vision")).toBeInTheDocument();
      expect(screen.getByText("Our Approach")).toBeInTheDocument();

      // Verify "Learn More About BIH" link targeting /about
      const learnMoreLink = screen.getByRole("link", { name: /learn more about bih/i });
      expect(learnMoreLink).toBeInTheDocument();
      expect(learnMoreLink.getAttribute("href")).toBe("/about");

      // Verify full-width photographic background image
      const bgImg = screen.getByAltText("Bridge for Impact Hub community initiatives");
      expect(bgImg).toBeInTheDocument();
      expect(bgImg).toHaveAttribute("src", "/aboutimageonhome.jpg");
    });
  });

  describe("Dedicated About BIH Page (/about)", () => {
    it("renders all core sections: Hero, Who We Are, Challenges, 4 Service Pillars, Mission & Vision, Values, Approach, Aspiration, and CTA", () => {
      render(
        <MemoryRouter initialEntries={["/about"]}>
          <AboutPage />
        </MemoryRouter>
      );

      // Section 1: Hero
      expect(
        screen.getByRole("heading", { level: 1, name: /bridging the gap between goodwill and action/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/across communities, passionate people, organizations, and initiatives/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/bridge for impact hub exists to help close that gap/i)
      ).toBeInTheDocument();

      // Verify Hero background image is aboutpagebg.jpg
      const heroBgImg = screen.getByAltText("Bridge for Impact Hub community collaboration");
      expect(heroBgImg).toHaveAttribute("src", "/aboutpagebg.jpg");

      // Section 2: Who We Are
      expect(screen.getByRole("heading", { level: 2, name: /who we are/i })).toBeInTheDocument();
      expect(
        screen.getByText(/active facilitation, not just a directory/i)
      ).toBeInTheDocument();

      // Section 3: The Challenge We Address
      expect(
        screen.getByRole("heading", { level: 2, name: /good ideas need more than good intentions/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/limited technical & organizational capacity/i)).toBeInTheDocument();
      expect(screen.getByText(/fragmented execution processes/i)).toBeInTheDocument();
      expect(screen.getByText(/difficulty accessing skilled volunteers/i)).toBeInTheDocument();
      expect(screen.getByText(/limited strategic collaborators & partnerships/i)).toBeInTheDocument();
      expect(screen.getByText(/challenges sustaining & scaling initiatives/i)).toBeInTheDocument();

      // Section 4: What We Do (4 pillars)
      expect(screen.getByRole("heading", { level: 2, name: /what we do/i })).toBeInTheDocument();
      expect(screen.getByText("Project Ideation & Design")).toBeInTheDocument();
      expect(screen.getByText("Execution Guidance")).toBeInTheDocument();
      expect(screen.getByText("Volunteer Sourcing & Management")).toBeInTheDocument();
      expect(screen.getByText("Strategic Partnership Facilitation")).toBeInTheDocument();

      // Section 5: Mission & Vision
      expect(screen.getByText("Our Mission")).toBeInTheDocument();
      expect(
        screen.getByText(
          /to create meaningful connections between those who want to help and those who need it most/i
        )
      ).toBeInTheDocument();
      expect(screen.getByText("Our Vision")).toBeInTheDocument();
      expect(
        screen.getByText(
          /to become ghana's leading partnership facilitation hub for humanitarian and social development actors/i
        )
      ).toBeInTheDocument();

      // Section 6: Our Values
      expect(screen.getByRole("heading", { level: 2, name: /our values/i })).toBeInTheDocument();
      expect(screen.getByText("Transparency")).toBeInTheDocument();
      expect(screen.getByText("Integrity")).toBeInTheDocument();
      expect(screen.getByText("Collaboration")).toBeInTheDocument();
      expect(screen.getByText("Service")).toBeInTheDocument();
      expect(screen.getByText("Innovation")).toBeInTheDocument();

      // Section 7: Our Approach
      expect(screen.getByRole("heading", { level: 2, name: /our approach/i })).toBeInTheDocument();
      expect(screen.getByText("Collaborative")).toBeInTheDocument();
      expect(screen.getByText("Context-Relevant")).toBeInTheDocument();
      expect(screen.getByText("Resource-Efficient")).toBeInTheDocument();
      expect(screen.getByText("Impact-Driven")).toBeInTheDocument();
      expect(screen.getByText("Results-Oriented")).toBeInTheDocument();

      // Section 8: Our Aspiration
      expect(screen.getByRole("heading", { level: 2, name: /our aspiration/i })).toBeInTheDocument();
      expect(
        screen.getByText(/bridge for impact hub seeks to work with forward-thinking ngos/i)
      ).toBeInTheDocument();

      // Section 9: Call to Action
      expect(
        screen.getByRole("heading", { level: 2, name: /let's turn ideas into impact/i })
      ).toBeInTheDocument();

      // Verify CTA background image is aboutpage2.jpg
      const ctaBgImg = screen.getByAltText("Community collaboration and volunteer teamwork");
      expect(ctaBgImg).toHaveAttribute("src", "/aboutpage2.jpg");

      // Verify CTA links
      const exploreLinks = screen.getAllByRole("link", { name: /explore projects/i });
      expect(exploreLinks.length).toBeGreaterThanOrEqual(1);
      expect(exploreLinks[0]).toHaveAttribute("href", "/projects");

      expect(screen.getByRole("link", { name: /volunteer sign-up/i })).toHaveAttribute("href", "/register/volunteer");
      expect(screen.getByRole("link", { name: /suggest a project/i })).toHaveAttribute("href", "/suggest-project");
      expect(screen.getByRole("link", { name: /register as ngo/i })).toHaveAttribute("href", "/register/ngo");
    });
  });
});
