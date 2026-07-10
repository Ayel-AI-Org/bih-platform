import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Users, Building2, HandHeart } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/database/client";
import { Skeleton } from "@/components/ui/skeleton";

const Hero = () => {
  const [stats, setStats] = useState({
    volunteers: null as number | string | null,
    ngos: null as number | string | null,
    projects: null as number | string | null,
    lives: null as string | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Fetch volunteers count
        const { count: volCount, error: volErr } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "volunteer");

        // 2. Fetch ngos count
        const { count: ngoCount, error: ngoErr } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "ngo");

        // 3. Fetch completed projects count
        const { count: projCount, error: projErr } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed");

        // 4. Fetch lives impacted from settings
        let livesValue = "—";
        try {
          const { data: livesData, error: livesErr } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "lives_impacted")
            .single();

          if (!livesErr && livesData) {
            livesValue = livesData.value;
          }
        } catch {
          // Keep as "—"
        }

        const formatStat = (count: number | null, hasError: any) => {
          if (hasError || count === null || count === undefined || count === 0) {
            return "Active";
          }
          return `${count}+`;
        };

        const formatLives = (val: string) => {
          if (!val || val === "0" || val === "—" || val === "0+") {
            return "Active";
          }
          return val;
        };

        setStats({
          volunteers: formatStat(volCount, volErr),
          ngos: formatStat(ngoCount, ngoErr),
          projects: formatStat(projCount, projErr),
          lives: formatLives(livesValue),
        });
      } catch (err) {
        setStats({
          volunteers: "Active",
          ngos: "Active",
          projects: "Active",
          lives: "Active",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsItems = [
    { icon: Users, label: "Volunteers", value: stats.volunteers },
    { icon: Building2, label: "Partner NGOs", value: stats.ngos },
    { icon: HandHeart, label: "Projects Funded", value: stats.projects },
    { icon: Heart, label: "Lives Impacted", value: stats.lives },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Community volunteers working together" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-transparent to-primary/60" />
      </div>

      <div className="container relative z-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent font-medium text-sm mb-6">
            Connecting Hearts, Building Futures
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-primary-foreground leading-tight mb-6">
            Bridge for{" "}
            <span className="text-accent">Impact</span> Hub
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mb-10 font-sans leading-relaxed">
            A central platform connecting volunteers, NGOs, philanthropists, and communities.
            Together, we make change visible, actionable, and lasting.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="hero" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/donate">
                <Heart className="w-5 h-5 mr-2" />
                Donate Now
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/register">Get Involved</Link>
            </Button>
          </div>
        </motion.div>

        {/* Quick stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {statsItems.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-primary-foreground/10"
            >
              <stat.icon className="w-8 h-8 text-accent flex-shrink-0" />
              <div className="min-w-0 flex-1">
                {loading ? (
                  <Skeleton className="h-6 w-16 bg-white/20" />
                ) : (
                  <div className="text-xl font-bold text-primary-foreground truncate">
                    {stat.value}
                  </div>
                )}
                <div className="text-sm text-primary-foreground/70 truncate">{stat.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
