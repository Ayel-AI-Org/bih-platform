import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectStatus = "proposed" | "ongoing" | "completed";

interface PlatformProject {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: ProjectStatus;
  timeline: string;
  imageUrl: string;
  partners: string[];
}

const statusStyles: Record<ProjectStatus, string> = {
  proposed: "bg-accent/15 text-accent",
  ongoing: "bg-primary/15 text-primary",
  completed: "bg-muted text-muted-foreground",
};

const statusLabel: Record<ProjectStatus, string> = {
  proposed: "Pending",
  ongoing: "Ongoing",
  completed: "Completed",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ProjectsSection = () => {
  const [projects, setProjects] = useState<PlatformProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) throw error;

        setProjects(
          (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            location: row.location,
            category: row.category || "",
            status: row.status as ProjectStatus,
            timeline: row.timeline || "",
            imageUrl: row.image_url || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80",
            partners: row.partners || [],
          }))
        );
      } catch (err) {
        console.error("Failed to fetch featured projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <section className="py-24 bg-background" id="projects">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">Our Work</span>
          <h2 className="text-3xl md:text-5xl font-serif text-foreground mt-3 mb-4">Featured Projects</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From proposals to completion, track the initiatives transforming communities.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-xl overflow-hidden bg-card border border-border p-4 space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No projects yet</p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {projects.map((project) => (
              <motion.div
                key={project.id}
                variants={item}
                className="group rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-52 overflow-hidden bg-slate-100">
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[project.status]}`}>
                      {statusLabel[project.status]}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-serif text-foreground mb-2">{project.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-3">{project.description}</p>
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.location}</span>
                      {project.partners && project.partners.length > 0 && (
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.partners.join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <Button variant="ghost" size="sm" className="px-0 text-[#1E3A5F] hover:text-[#1E3A5F]/80" asChild>
                    <Link to={`/projects/${project.id}`}>
                      Learn More <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" asChild>
            <Link to="/projects">View All Projects</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
