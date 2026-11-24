import { motion } from "framer-motion";
import { Target, Eye, Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <section className="relative overflow-hidden text-white py-20 sm:py-24 md:py-28 lg:py-32" id="about">
      {/* Full-bleed background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/aboutimageonhome.jpg"
          alt="Bridge for Impact Hub community initiatives"
          className="w-full h-full object-cover object-[75%_center] sm:object-[70%_center] lg:object-[center_center]"
        />

        {/* Directional gradient overlay:
            - Left: Deep, high-contrast navy protecting text legibility (~95%)
            - Middle: Smooth transition (~50-60%)
            - Right: Translucent/light (~8-15%) so the photograph natural colors and subjects remain clearly visible */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,21,35,0.96)_0%,rgba(15,30,51,0.92)_50%,rgba(22,44,71,0.80)_100%)] sm:bg-[linear-gradient(to_right,rgba(11,21,35,0.96)_0%,rgba(15,30,51,0.94)_35%,rgba(22,44,71,0.65)_55%,rgba(22,44,71,0.25)_75%,rgba(22,44,71,0.08)_100%)]"
        />

        {/* Subtle top & bottom divider hairline accents */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
        />
      </div>

      <div className="container relative z-10 max-w-6xl">
        {/* Content aligned to left, vertically balanced, occupying controlled width */}
        <div className="max-w-xl lg:max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6 text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#D4A017] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017] animate-pulse" />
              About BIH
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-bold tracking-tight leading-tight">
              Bridging the gap between <span className="text-[#D4A017]">goodwill</span> and{" "}
              <span className="text-[#D4A017]">action</span>
            </h2>

            <p className="text-white/90 text-base sm:text-lg leading-relaxed font-sans">
              Bridge for Impact Hub is a social impact organization connecting ideas, people,
              organizations, and resources to strengthen humanitarian and community development
              initiatives through structured project support, volunteer mobilization, and
              strategic partnerships.
            </p>

            <div className="space-y-3.5 pt-2">
              {[
                {
                  icon: Target,
                  title: "Our Mission",
                  text: "To create meaningful connections between those who want to help and those who need it most.",
                },
                {
                  icon: Eye,
                  title: "Our Vision",
                  text: "A world where every community has access to the resources and partnerships needed to thrive.",
                },
                {
                  icon: Lightbulb,
                  title: "Our Approach",
                  text: "Technology-driven transparency, collaboration, and measurable impact at every level.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-3.5 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-xs border border-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#D4A017]/20 border border-[#D4A017]/30 flex items-center justify-center flex-shrink-0 text-[#D4A017]">
                    <item.icon className="w-5 h-5 text-[#D4A017]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm sm:text-base mb-0.5">{item.title}</h4>
                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                to="/about"
                className="group inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-white hover:text-[#D4A017] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] rounded-sm py-1 cursor-pointer"
              >
                <span className="group-hover:underline underline-offset-4 decoration-[#D4A017]">
                  Learn More About BIH
                </span>
                <ArrowRight className="w-4 h-4 text-[#D4A017] transition-transform duration-200 group-hover:translate-x-1 shrink-0" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
