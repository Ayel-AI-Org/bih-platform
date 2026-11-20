import Hero from "@/components/sections/home/Hero";
import LatestUpdatesSection from "@/components/sections/home/LatestUpdatesSection";
import About from "@/components/sections/home/About";
import ProjectsSection from "@/components/sections/home/ProjectsSection";
import GetInvolved from "@/components/sections/home/GetInvolved";

const Index = () => {
  return (
    <>
      <Hero />
      <LatestUpdatesSection />
      <About />
      <ProjectsSection />
      <GetInvolved />
    </>
  );
};

export default Index;
