import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Suggest Project", href: "/suggest-project" },
  { label: "Media", href: "/media" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Track scroll position to refine surface appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle keyboard accessibility (Escape closes menu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300 motion-reduce:transition-none",
          isScrolled
            ? "bg-[#162C47]/95 backdrop-blur-md border-b border-white/[0.12] shadow-md shadow-slate-950/20"
            : "bg-[#1E3A5F]/90 backdrop-blur-md border-b border-white/[0.08] shadow-xs"
        )}
      >
        {/* Subtle top highlight for tonal depth */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
        />

        <nav
          className="container px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
          aria-label="Main Navigation"
        >
          {/* Logo & Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-2.5 sm:gap-3 py-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] rounded-md transition-opacity hover:opacity-95"
            aria-label="Bridge for Impact Hub Home"
          >
            <img
              src="/BIH_logo.jpeg"
              alt="Bridge for Impact Hub Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-white/20 object-cover bg-white shadow-xs shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-sm sm:text-base font-serif text-white tracking-tight leading-tight select-none">
              Bridge for <span className="text-[#D4A017] font-semibold">Impact</span> Hub{" "}
              <span className="text-white/80 font-sans text-xs font-normal hidden min-[400px]:inline">
                (BIH)
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links & CTAs */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-6 lg:gap-7">
              {navLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.href}
                  end={link.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "group relative py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] rounded-sm",
                      isActive
                        ? "text-white font-semibold"
                        : "text-white/80 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <span className="relative flex flex-col items-center">
                      <span>{link.label}</span>
                      {/* Subtle restrained gold active indicator */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute -bottom-1.5 left-0 right-0 h-[2px] rounded-full transition-all duration-200 motion-reduce:transition-none",
                          isActive
                            ? "bg-[#D4A017] opacity-100 scale-x-100 shadow-[0_0_8px_rgba(212,160,23,0.4)]"
                            : "bg-transparent opacity-0 scale-x-0 group-hover:bg-white/40 group-hover:opacity-100 group-hover:scale-x-75"
                        )}
                      />
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-white/15">
              <Button
                size="sm"
                asChild
                className="bg-[#D4A017] hover:bg-[#c29214] active:bg-[#b08410] text-white font-semibold shadow-xs hover:shadow-md hover:shadow-[#D4A017]/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 h-9 px-4 rounded-md border-0 focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3A5F]"
              >
                <Link to="/donate">Donate</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border border-white/25 hover:border-white/50 text-white hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 backdrop-blur-xs font-medium transition-all duration-200 h-9 px-3.5 rounded-md focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3A5F]"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          {/* Mobile Actions: Compact Donate CTA + Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              size="sm"
              asChild
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-[#D4A017] hover:bg-[#c29214] active:bg-[#b08410] text-white rounded-md shadow-xs active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[#D4A017]"
            >
              <Link to="/donate">Donate</Link>
            </Button>
            <button
              type="button"
              className="text-white p-2 hover:bg-white/10 active:bg-white/15 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer overlay */}
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className={cn(
            "absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-[#172E4C] flex flex-col text-white p-6 shadow-2xl border-r border-white/10 transform transition-transform duration-300 ease-in-out motion-reduce:transition-none",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/BIH_logo.jpeg"
                alt="Bridge for Impact Hub Logo"
                className="h-8 w-8 rounded-full border border-white/20 object-cover bg-white shadow-xs"
              />
              <span className="font-serif font-bold text-sm tracking-tight text-white">
                Bridge for <span className="text-[#D4A017]">Impact</span> Hub
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Navigation Links */}
          <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto" aria-label="Mobile Menu Links">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.href}
                end={link.href === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center min-h-[44px] px-3.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]",
                    isActive
                      ? "bg-white/10 text-[#D4A017] font-semibold border-l-2 border-[#D4A017]"
                      : "text-white/80 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Drawer Action CTAs */}
          <div className="space-y-3 pt-6 border-t border-white/10 mt-auto">
            <Button
              className="w-full bg-[#D4A017] hover:bg-[#c29214] active:bg-[#b08410] text-white font-semibold h-11 border-none shadow-xs focus-visible:ring-2 focus-visible:ring-[#D4A017]"
              asChild
            >
              <Link to="/donate" onClick={() => setOpen(false)}>
                Donate
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white h-11 bg-transparent font-medium focus-visible:ring-2 focus-visible:ring-white/50"
              asChild
            >
              <Link to="/login" onClick={() => setOpen(false)}>
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
