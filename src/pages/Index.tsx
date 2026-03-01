import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProjectsSection from "@/components/ProjectsSection";
import GetInvolved from "@/components/GetInvolved";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <About />
      <ProjectsSection />
      <GetInvolved />
      <Footer />
    </div>
  );
};

export default Index;
