import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Get Involved", href: "#get-involved" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10">
      <div className="container flex items-center justify-between h-16">
        <a href="#" className="text-xl font-serif text-primary-foreground tracking-tight">
          Bridge for <span className="text-accent">Impact</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Button variant="hero" size="sm">
            Donate
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
            <a
              key={link.label}
              href={link.href}
              className="block px-6 py-3 text-primary-foreground/80 hover:text-primary-foreground text-sm"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="px-6 pt-2">
            <Button variant="hero" size="sm" className="w-full">
              Donate
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
