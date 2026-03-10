import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getProjects } from "@/lib/platform-data";
import type { Project } from "@/types/models";
import { Button } from "@/components/ui/button";

type ProjectStatus = "proposed" | "ongoing" | "completed";

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
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const run = async () => {
      const items = await getProjects();
      setProjects(items.slice(0, 3));
    };

    run();
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
              className="group rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-52 overflow-hidden">
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
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{project.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.partners.join(", ")}</span>
                </div>
                <Button variant="ghost" size="sm" className="px-0 text-primary hover:text-primary/80" asChild>
                  <Link to={`/projects/${project.id}`}>
                    Learn More <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

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
