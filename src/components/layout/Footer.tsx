import { Heart, Mail, MapPin, Phone, Instagram, Linkedin, Share2, ExternalLink, SlidersHorizontal } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "@/database/operations";
import { useConsent } from "@/context/ConsentContext";

const Footer = () => {
  const { openPreferences } = useConsent();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminDashboard = location.pathname === "/admin";

  const handleAdminFooterAction = async () => {
    if (!isAdminDashboard) {
      return;
    }

    await logout();
    navigate("/login");
  };

  return (
    <footer className="bg-primary text-primary-foreground pt-10 md:pt-16 pb-12 md:pb-8" id="contact">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 mb-8 md:mb-12">
          {/* Brand & Contact */}
          <div className="md:col-span-5 text-center md:text-left flex flex-col items-center md:items-start">
            <h3 className="text-xl md:text-2xl font-serif mb-3 md:mb-4">
              Bridge for <span className="text-accent">Impact</span> Hub
            </h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-md mb-4 md:mb-6">
              Connecting volunteers, NGOs, philanthropists, and communities to create
              lasting, measurable change across the region.
            </p>
            <div className="space-y-1.5 md:space-y-2 text-sm text-primary-foreground/70 w-full">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4 shrink-0 text-accent" />
                <a href="mailto:bridgeforimpacthub@gmail.com" className="hover:text-primary-foreground transition-colors">
                  bridgeforimpacthub@gmail.com
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Phone className="w-4 h-4 shrink-0 text-accent" />
                <a href="tel:+233530110924" className="hover:text-primary-foreground transition-colors">
                  +233 (0) 53 011 0924
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-accent" />
                <span>Accra, Ghana</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-6 text-center md:text-left md:col-span-4 w-full">
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm uppercase tracking-wider text-accent">Quick Links</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li><Link to="/" className="hover:text-primary-foreground transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-primary-foreground transition-colors">About BIH</Link></li>
                <li><Link to="/projects" className="hover:text-primary-foreground transition-colors">Projects</Link></li>
                <li><Link to="/suggest-project" className="hover:text-primary-foreground transition-colors">Suggest Project</Link></li>
                <li><Link to="/media" className="hover:text-primary-foreground transition-colors">Media & Updates</Link></li>
                <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm uppercase tracking-wider text-accent">For Partners</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li><Link to="/register/ngo" className="hover:text-primary-foreground transition-colors">Register as NGO</Link></li>
                <li><Link to="/register/volunteer" className="hover:text-primary-foreground transition-colors">Volunteer Sign-up</Link></li>
                <li><Link to="/register/donor" className="hover:text-primary-foreground transition-colors">Donor Portal</Link></li>
                <li><Link to="/donate" className="hover:text-primary-foreground transition-colors">Donate</Link></li>
              </ul>
            </div>
          </div>

          {/* Follow BIH / Social Presence */}
          <div className="md:col-span-3 text-center md:text-left flex flex-col items-center md:items-start space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-accent">Follow BIH</h4>
            <p className="text-primary-foreground/70 text-xs leading-relaxed max-w-xs">
              Stay connected with our community, projects, stories, and impact.
            </p>

            {/* Mobile Icon-Only Row (<sm) */}
            <div className="flex sm:hidden items-center justify-center gap-3 pt-1 w-full">
              <a
                href="https://gh.linkedin.com/in/bridge-for-impact-hub-7ba11a38b"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 w-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-accent hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Follow Bridge for Impact Hub on LinkedIn"
              >
                <Linkedin className="w-5 h-5 shrink-0" aria-hidden="true" />
              </a>

              <a
                href="https://instagram.com/bridgeforimpact_hub"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 w-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-accent hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Follow BIH on Instagram: @bridgeforimpact_hub"
              >
                <Instagram className="w-5 h-5 shrink-0" aria-hidden="true" />
              </a>

              <a
                href="https://linktr.ee/BridgeforImpact_Hub"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 w-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-accent hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="BIH Social Links landing page on Linktree"
              >
                <Share2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              </a>
            </div>

            {/* Desktop Branded Layout (>=sm) */}
            <div className="hidden sm:flex flex-col gap-2 pt-1 w-full max-w-xs">
              <a
                href="https://gh.linkedin.com/in/bridge-for-impact-hub-7ba11a38b"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-primary-foreground/90 hover:text-white transition-all group"
                aria-label="Follow Bridge for Impact Hub on LinkedIn"
              >
                <span className="flex items-center gap-2 truncate">
                  <Linkedin className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="font-medium truncate">LinkedIn</span>
                </span>
                <ExternalLink className="w-3 h-3 text-primary-foreground/40 group-hover:text-accent transition-colors shrink-0" />
              </a>

              <a
                href="https://instagram.com/bridgeforimpact_hub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-primary-foreground/90 hover:text-white transition-all group"
                aria-label="Follow BIH on Instagram: @bridgeforimpact_hub"
              >
                <span className="flex items-center gap-2 truncate">
                  <Instagram className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="font-medium truncate">@bridgeforimpact_hub</span>
                </span>
                <ExternalLink className="w-3 h-3 text-primary-foreground/40 group-hover:text-accent transition-colors shrink-0" />
              </a>

              <a
                href="https://linktr.ee/BridgeforImpact_Hub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-primary-foreground/90 hover:text-white transition-all group"
                aria-label="BIH Social Links landing page on Linktree"
              >
                <span className="flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="font-medium">Social Hub (Linktree)</span>
                </span>
                <ExternalLink className="w-3 h-3 text-primary-foreground/40 group-hover:text-accent transition-colors shrink-0" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between text-center md:text-left text-xs text-primary-foreground/70 gap-4 md:gap-2">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-primary-foreground/60">
            <p>© 2026 Bridge for Impact Hub. All rights reserved.</p>
            <span className="hidden sm:inline opacity-40">•</span>
            <div className="flex items-center gap-3">
              <Link to="/privacy" className="hover:text-primary-foreground transition-colors underline-offset-4 hover:underline">
                Privacy
              </Link>
              <span className="opacity-40">•</span>
              <Link to="/terms" className="hover:text-primary-foreground transition-colors underline-offset-4 hover:underline">
                Terms
              </Link>
              <span className="opacity-40">•</span>
              <button
                type="button"
                onClick={openPreferences}
                className="inline-flex items-center gap-1.5 hover:text-accent transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm text-primary-foreground/80 font-medium"
                aria-label="Manage cookie and privacy preferences"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cookie Preferences</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="flex items-center gap-1 text-primary-foreground/60">
              Made with <Heart className="w-3 h-3 text-accent" /> for communities everywhere
            </p>
            {isAdminDashboard ? (
              <button
                type="button"
                onClick={handleAdminFooterAction}
                className="w-auto text-center md:text-right text-xs font-semibold uppercase tracking-wide text-primary-foreground/90 hover:text-primary-foreground transition-colors"
                aria-label="Logout"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                state={{ from: "/admin" }}
                className="w-auto text-center md:text-right text-[10px] tracking-wide uppercase opacity-35 hover:opacity-65 transition-opacity"
                aria-label="Login as admin"
              >
                login/register
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
