import { motion } from "framer-motion";
import { HandHeart, Building2, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  {
    icon: Users,
    title: "Volunteer",
    description: "Lend your time and skills to community projects. Make a tangible difference on the ground.",
    cta: "Sign Up as Volunteer",
  },
  {
    icon: Building2,
    title: "NGO / Organization",
    description: "Register your organization, list projects, and connect with donors and volunteers.",
    cta: "Register Organization",
  },
  {
    icon: HandHeart,
    title: "Donor / Philanthropist",
    description: "Support initiatives that matter. Track your impact with full transparency and reporting.",
    cta: "Start Giving",
  },
];

const GetInvolved = () => {
  return (
    <section className="py-24 bg-card" id="get-involved">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">Join Us</span>
          <h2 className="text-3xl md:text-5xl font-serif text-foreground mt-3 mb-4">Get Involved</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you volunteer, partner, or donate — your contribution creates ripples of change.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-xl bg-background border border-border p-8 text-center group hover:border-accent/40 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-accent/15 transition-colors">
                <role.icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
              </div>
              <h3 className="text-xl font-serif text-foreground mb-3">{role.title}</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{role.description}</p>
              <Button variant="default" size="sm">
                {role.cta} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GetInvolved;
