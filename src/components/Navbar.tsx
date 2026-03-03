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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="text-xl font-serif text-primary-foreground tracking-tight">
          Bridge for <span className="text-accent">Impact</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.href}
              className={({ isActive }) =>
                `text-sm transition-colors ${
                  isActive ? "text-primary-foreground" : "text-primary-foreground/80 hover:text-primary-foreground"
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

        {/* Mobile toggle */}
        <button
          className="md:hidden text-primary-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-primary border-t border-primary-foreground/10 pb-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.href}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm ${
                  isActive ? "text-primary-foreground" : "text-primary-foreground/80 hover:text-primary-foreground"
                }`
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="px-6 pt-2 space-y-2">
            <Button variant="hero" size="sm" className="w-full" asChild>
              <Link to="/donate" onClick={() => setOpen(false)}>
                Donate
              </Link>
            </Button>
            <Button variant="hero-outline" size="sm" className="w-full" asChild>
              <Link to="/login" onClick={() => setOpen(false)}>
                Login
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
