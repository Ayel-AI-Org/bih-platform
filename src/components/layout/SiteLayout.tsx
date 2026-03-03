import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiChatbot from "@/components/AiChatbot";

const SiteLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
      <AiChatbot />
    </div>
  );
};

export default SiteLayout;
