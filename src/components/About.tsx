import { motion } from "framer-motion";
import { Target, Eye, Lightbulb } from "lucide-react";

const About = () => {
  return (
    <section className="py-24 bg-background" id="about">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-widest">About BIH</span>
            <h2 className="text-3xl md:text-5xl font-serif text-foreground mt-3 mb-6">
              Bridging the gap between goodwill and action
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Bridge for Impact Hub is a central digital platform that connects volunteers,
              NGOs, philanthropists, and community initiatives. We make projects visible,
              enable collaboration, support fundraising, and improve transparency across
              the humanitarian ecosystem.
            </p>
            <div className="space-y-6">
              {[
                { icon: Target, title: "Our Mission", text: "To create meaningful connections between those who want to help and those who need it most." },
                { icon: Eye, title: "Our Vision", text: "A world where every community has access to the resources and partnerships needed to thrive." },
                { icon: Lightbulb, title: "Our Approach", text: "Technology-driven transparency, collaboration, and measurable impact at every level." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-muted-foreground text-sm">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80"
                alt="Team collaboration"
                className="w-full h-[500px] object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-accent text-accent-foreground rounded-xl px-6 py-4 shadow-lg">
              <div className="text-3xl font-bold font-serif">5+</div>
              <div className="text-sm font-medium">Years of Impact</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
