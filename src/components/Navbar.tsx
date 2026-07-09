import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Suggest Project", href: "/suggest-project" },
  { label: "Media", href: "/media" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 py-1.5">
            <img
              src="/BIH_logo.jpeg"
              alt="Bridge for Impact Hub Logo"
              className="h-12 w-12 rounded-full border-2 border-[#1E3A5F] object-cover bg-white shadow-sm"
            />
            <span className="text-sm sm:text-base font-serif text-primary-foreground tracking-tight hidden sm:inline-block">
              Bridge for <span className="text-[#D4A017]">Impact</span> Hub (BIH)
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.href}
                className={({ isActive }) =>
                  `text-sm transition-colors ${
                    isActive ? "text-primary-foreground font-semibold" : "text-primary-foreground/80 hover:text-primary-foreground"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Button variant="hero" size="sm" asChild>
              <Link to="/donate">Donate</Link>
            </Button>
            <Button variant="hero-outline" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            className="md:hidden text-primary-foreground p-1 hover:bg-primary-foreground/10 rounded-md"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile full-height slide-in drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Dark Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        {/* Drawer overlay */}
        <div
          className={`absolute top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-[#1E3A5F] flex flex-col text-white p-6 shadow-xl transform transition-transform duration-250 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <span className="font-serif font-bold text-base tracking-wide">Menu</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white p-1 hover:bg-white/10 rounded-md"
              aria-label="Close navigation menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-4 flex-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.href}
                className={({ isActive }) =>
                  `text-base py-1 transition-colors ${
                    isActive ? "text-[#D4A017] font-semibold" : "text-white/80 hover:text-white"
                  }`
                }
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="space-y-3 pt-6 border-t border-white/10">
            <Button
              className="w-full bg-[#D4A017] hover:bg-[#D4A017]/90 text-white font-medium h-10 border-none"
              asChild
            >
              <Link to="/donate" onClick={() => setOpen(false)}>
                Donate
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white h-10 bg-transparent"
              asChild
            >
              <Link to="/login" onClick={() => setOpen(false)}>
                Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
