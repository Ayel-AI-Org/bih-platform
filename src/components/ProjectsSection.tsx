import { motion } from "framer-motion";
import { MapPin, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProjectStatus = "proposed" | "ongoing" | "completed";

interface Project {
  title: string;
  description: string;
  location: string;
  status: ProjectStatus;
  partners: string;
  image: string;
}

const statusStyles: Record<ProjectStatus, string> = {
  proposed: "bg-accent/15 text-accent",
  ongoing: "bg-primary/15 text-primary",
  completed: "bg-muted text-muted-foreground",
};

const projects: Project[] = [
  {
    title: "Clean Water Initiative",
    description: "Providing sustainable clean water access to 5 rural communities through borehole drilling and maintenance training.",
    location: "Northern Region",
    status: "ongoing",
    partners: "WaterAid, Local Council",
    image: "https://images.unsplash.com/photo-1594398901394-4e34939a02d0?w=600&q=80",
  },
  {
    title: "Youth Skills Training",
    description: "Digital literacy and vocational training program empowering 200+ young people with marketable skills.",
    location: "Urban District",
    status: "proposed",
    partners: "Tech4Good, UNICEF",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80",
  },
  {
    title: "Community Health Outreach",
    description: "Free health screenings and wellness education reaching 10,000 community members across 15 villages.",
    location: "Eastern Province",
    status: "completed",
    partners: "Red Cross, Ministry of Health",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ProjectsSection = () => {
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
              key={project.title}
              variants={item}
              className="group rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[project.status]}`}>
                  {project.status}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-serif text-foreground mb-2">{project.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{project.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.partners}</span>
                </div>
                <Button variant="ghost" size="sm" className="px-0 text-primary hover:text-primary/80">
                  Learn More <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Projects
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
