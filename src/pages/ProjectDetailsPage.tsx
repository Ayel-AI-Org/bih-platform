import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Users } from "lucide-react";
import { getProjectById } from "@/lib/platform-data";
import type { Project } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ProjectDetailsPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!projectId) {
        setProject(undefined);
        setIsLoading(false);
        return;
      }

      const item = await getProjectById(projectId);
      setProject(item);
      setIsLoading(false);
    };

    run();
  }, [projectId]);

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container max-w-2xl text-center text-muted-foreground">Loading project...</div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="py-16">
        <div className="container max-w-2xl text-center space-y-4">
          <h1 className="text-3xl">Project not found</h1>
          <p className="text-muted-foreground">The requested project does not exist or has been removed.</p>
          <Button asChild>
            <Link to="/projects">Back to projects</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container max-w-4xl space-y-8">
        <img src={project.imageUrl} alt={project.title} className="w-full h-72 rounded-xl object-cover border" />
        <div className="space-y-4">
          <Badge className="capitalize">{project.status}</Badge>
          <h1 className="text-3xl md:text-5xl">{project.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{project.description}</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border p-4">
              <p className="font-medium mb-2">Location</p>
              <p className="text-muted-foreground flex gap-2"><MapPin className="h-4 w-4 mt-0.5" /> {project.location}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="font-medium mb-2">Partners</p>
              <p className="text-muted-foreground flex gap-2"><Users className="h-4 w-4 mt-0.5" /> {project.partners.join(", ")}</p>
            </div>
            <div className="rounded-md border p-4 md:col-span-2">
              <p className="font-medium mb-2">Timeline</p>
              <p className="text-muted-foreground">{project.timeline}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/donate?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}>
                Support this project
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/projects">Back to project list</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectDetailsPage;
