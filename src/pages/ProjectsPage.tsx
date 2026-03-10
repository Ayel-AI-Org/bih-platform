import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users } from "lucide-react";
import { getProjects } from "@/lib/platform-data";
import type { Project, ProjectStatus } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusTone: Record<ProjectStatus, "default" | "secondary" | "outline"> = {
  proposed: "outline",
  ongoing: "default",
  completed: "secondary",
};

const statusLabel: Record<ProjectStatus, string> = {
  proposed: "pending",
  ongoing: "ongoing",
  completed: "completed",
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const items = await getProjects();
        setProjects(items);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, []);

  const renderList = (status: ProjectStatus) => {
    const items = projects.filter((project) => project.status === status);

    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">No projects in this category yet.</p>;
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <img src={project.imageUrl} alt={project.title} className="h-44 w-full object-cover" />
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-2xl">{project.title}</CardTitle>
                <Badge variant={statusTone[project.status]} className="capitalize">{statusLabel[project.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5" /> {project.location}</p>
              <p className="flex gap-2"><Users className="h-4 w-4 mt-0.5" /> {project.partners.join(", ")}</p>
              <p><span className="font-medium text-foreground">Timeline:</span> {project.timeline}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/projects/${project.id}`}>View project details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <section className="py-16">
      <div className="container">
        <div className="mb-8">
          <p className="text-sm font-semibold text-accent uppercase tracking-widest">Projects</p>
          <h1 className="text-3xl md:text-5xl mt-3 mb-3">Project visibility and tracking</h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse pending, ongoing, and completed BIH projects with timeline, location, and partner details.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading projects...</p>
        ) : (
        <Tabs defaultValue="ongoing" className="space-y-6">
          <TabsList>
            <TabsTrigger value="proposed">Pending</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="proposed">{renderList("proposed")}</TabsContent>
          <TabsContent value="ongoing">{renderList("ongoing")}</TabsContent>
          <TabsContent value="completed">{renderList("completed")}</TabsContent>
        </Tabs>
        )}
      </div>
    </section>
  );
};

export default ProjectsPage;
