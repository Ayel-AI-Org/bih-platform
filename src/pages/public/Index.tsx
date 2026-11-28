import { useEffect, useState } from "react";
import Hero from "@/components/sections/home/Hero";
import LatestUpdatesSection from "@/components/sections/home/LatestUpdatesSection";
import PromotionalVideoShowcase from "@/components/sections/home/PromotionalVideoShowcase";
import About from "@/components/sections/home/About";
import ProjectsSection from "@/components/sections/home/ProjectsSection";
import GetInvolved from "@/components/sections/home/GetInvolved";
import {
  getHomepageShowcaseSettings,
  DEFAULT_HOMEPAGE_SHOWCASE_SETTINGS,
} from "@/database/operations";
import { type HomepageShowcaseSettings } from "@/database/types";

const Index = () => {
  const [showcaseSettings, setShowcaseSettings] = useState<HomepageShowcaseSettings>(
    DEFAULT_HOMEPAGE_SHOWCASE_SETTINGS
  );

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const data = await getHomepageShowcaseSettings();
        if (isMounted) {
          setShowcaseSettings(data);
        }
      } catch {
        // Fall back gracefully to default updates mode
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Hero />

      {/* Dynamic Showcase Area */}
      {showcaseSettings.mode === "video" ? (
        <>
          <PromotionalVideoShowcase settings={showcaseSettings} />
          {showcaseSettings.showLatestUpdatesBelow && <LatestUpdatesSection />}
        </>
      ) : (
        <LatestUpdatesSection />
      )}

      <About />
      <ProjectsSection />
      <GetInvolved />
    </>
  );
};

export default Index;
