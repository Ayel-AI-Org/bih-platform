import { Heart, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground pt-16 pb-8" id="contact">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-serif mb-4">
              Bridge for <span className="text-accent">Impact</span> Hub
            </h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-md mb-6">
              Connecting volunteers, NGOs, philanthropists, and communities to create
              lasting, measurable change across the region.
            </p>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@bridgeforimpact.org</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> +1 (234) 567-890</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Community Center, Main Street</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">Home</Link></li>
              <li><Link to="/projects" className="hover:text-primary-foreground transition-colors">Projects</Link></li>
              <li><Link to="/suggest-project" className="hover:text-primary-foreground transition-colors">Suggest Project</Link></li>
              <li><Link to="/media" className="hover:text-primary-foreground transition-colors">Media & Articles</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">For Partners</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/register/ngo" className="hover:text-primary-foreground transition-colors">Register as NGO</Link></li>
              <li><Link to="/register/volunteer" className="hover:text-primary-foreground transition-colors">Volunteer Sign-up</Link></li>
              <li><Link to="/register/donor" className="hover:text-primary-foreground transition-colors">Donor Portal</Link></li>
              <li><Link to="/donate" className="hover:text-primary-foreground transition-colors">Donate</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-primary-foreground/50">
          <p>© 2026 Bridge for Impact Hub. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 md:mt-0">
            Made with <Heart className="w-3 h-3 text-accent" /> for communities everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
