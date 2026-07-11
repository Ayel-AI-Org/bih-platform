import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/database/client";
import type { ProjectStatus } from "@/database/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface CatalogProject {
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

const statusTone: Record<ProjectStatus, string> = {
  proposed: "bg-[#C8601A] text-white hover:bg-[#C8601A]/90",
  ongoing: "bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90",
  completed: "bg-[#6B8E3E] text-white hover:bg-[#6B8E3E]/90",
};

const statusLabel: Record<ProjectStatus, string> = {
  proposed: "pending",
  ongoing: "ongoing",
  completed: "completed",
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState<CatalogProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

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
        console.error("Failed to fetch projects database:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const renderList = (status: ProjectStatus) => {
    const items = projects.filter((project) => {
      const matchesStatus = project.status === status;
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    if (items.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground bg-slate-50 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-6 w-6 text-slate-400" />
          <p className="text-sm font-medium">
            {searchQuery
              ? `No projects match "${searchQuery}" in this category.`
              : `No ${statusLabel[status]} projects at the moment.`}
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((project) => (
          <Card key={project.id} className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <img
                src={project.imageUrl}
                alt={project.title}
                className="h-44 w-full object-cover bg-slate-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder.svg";
                }}
              />
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl font-serif text-[#1E3A5F] font-bold line-clamp-2">{project.title}</CardTitle>
                  <Badge className={`capitalize border-none text-[9px] font-bold py-0.5 px-2 ${statusTone[project.status]}`}>
                    {statusLabel[project.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{project.description}</p>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <p className="flex gap-2"><MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" /> {project.location}</p>
                {project.partners.length > 0 && (
                  <p className="flex gap-2"><Users className="h-4 w-4 text-slate-400 flex-shrink-0" /> {project.partners.join(", ")}</p>
                )}
                <p><span className="font-semibold text-slate-700">Timeline:</span> {project.timeline}</p>
              </CardContent>
            </div>
            <div className="px-6 pb-6 pt-0">
              <Button asChild variant="outline" className="w-full text-xs h-9 border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50">
                <Link to={`/projects/${project.id}`}>View project details</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <section className="py-16 bg-[#F5F5F5] min-h-[80vh]">
      <div className="container">
        <div className="mb-8">
          <p className="text-sm font-semibold text-accent uppercase tracking-widest">Projects</p>
          <h1 className="text-3xl md:text-5xl font-serif text-[#1E3A5F] font-bold mt-3 mb-3">Project visibility and tracking</h1>
          <p className="text-[#2C2C2C] max-w-2xl text-sm md:text-base leading-relaxed">
            Browse pending, ongoing, and completed BIH projects with timeline, location, and partner details.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-xl overflow-hidden bg-card border border-border p-4 space-y-4">
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="ongoing" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200">
              <TabsList className="bg-slate-100/80 p-0 border-none w-fit rounded-b-none rounded-t-lg -mb-px flex gap-0.5">
                <TabsTrigger value="proposed">Pending</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>
            </div>

            <TabsContent value="proposed" className="mt-0">{renderList("proposed")}</TabsContent>
            <TabsContent value="ongoing" className="mt-0">{renderList("ongoing")}</TabsContent>
            <TabsContent value="completed" className="mt-0">{renderList("completed")}</TabsContent>
          </Tabs>
        )}
      </div>
    </section>
  );
};

export default ProjectsPage;
