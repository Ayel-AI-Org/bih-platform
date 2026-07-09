import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Users, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PlatformProject {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: "proposed" | "ongoing" | "completed";
  timeline: string;
  imageUrl: string;
  partners: string[];
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  completedAt: string | null;
}

const ProjectDetailsPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<PlatformProject | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) {
        setProject(null);
        setIsLoading(false);
        return;
      }

      try {
        // 1. Query project details
        const { data: projData, error: projErr } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projErr || !projData) {
          setProject(null);
        } else {
          setProject({
            id: projData.id,
            title: projData.title,
            description: projData.description,
            location: projData.location,
            category: projData.category || "",
            status: projData.status as any,
            timeline: projData.timeline || "",
            imageUrl: projData.image_url || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80",
            partners: projData.partners || [],
          });

          // 2. Query project milestones
          const { data: milData, error: milErr } = await supabase
            .from("milestones")
            .select("*")
            .eq("project_id", projectId)
            .order("target_date", { ascending: true });

          if (!milErr && milData) {
            setMilestones(
              milData.map((row: any) => ({
                id: row.id,
                title: row.title,
                description: row.description || "",
                targetDate: row.target_date,
                completedAt: row.completed_at,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to retrieve project details:", err);
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container max-w-4xl space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="py-24">
        <div className="container max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-[#C8601A] mx-auto" />
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Project not found</h1>
          <p className="text-muted-foreground text-sm">The requested project does not exist or has been removed from the registry.</p>
          <Button asChild className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
            <Link to="/projects">Back to projects</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container max-w-4xl space-y-8">
        <img src={project.imageUrl} alt={project.title} className="w-full h-72 rounded-xl object-cover border bg-slate-100" />
        <div className="space-y-6">
          <Badge
            className={`text-[10px] uppercase font-bold tracking-wider font-sans border-none text-white ${
              project.status === "completed"
                ? "bg-[#6B8E3E] hover:bg-[#6B8E3E]/90"
                : project.status === "ongoing"
                ? "bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
                : "bg-[#C8601A] hover:bg-[#C8601A]/90"
            }`}
          >
            {project.status}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-serif text-[#1E3A5F] font-bold">{project.title}</h1>
          <p className="text-[#2C2C2C] leading-relaxed text-sm md:text-base">{project.description}</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm pt-2">
            <div className="rounded-md border p-4 bg-white/50">
              <p className="font-semibold text-[#1E3A5F] mb-2">Location</p>
              <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /> {project.location}</p>
            </div>
            <div className="rounded-md border p-4 bg-white/50">
              <p className="font-semibold text-[#1E3A5F] mb-2">Partners</p>
              <p className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" /> {project.partners.length > 0 ? project.partners.join(", ") : "None listed"}</p>
            </div>
            <div className="rounded-md border p-4 md:col-span-2 bg-white/50">
              <p className="font-semibold text-[#1E3A5F] mb-2">Timeline</p>
              <p className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /> {project.timeline}</p>
            </div>
          </div>

          {/* Milestones Section */}
          {milestones.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <h3 className="text-xl font-serif text-[#1E3A5F] font-bold">Project Milestones</h3>
              <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                {milestones.map((m) => (
                  <div key={m.id} className="relative">
                    <span className={`absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${m.completedAt ? "bg-[#6B8E3E]" : "bg-slate-300"}`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-800 text-sm">{m.title}</h4>
                        {m.completedAt ? (
                          <Badge className="bg-[#6B8E3E] text-white hover:bg-[#6B8E3E]/90 text-[8px] uppercase font-bold py-0 h-4 border-none">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] uppercase font-bold py-0 h-4 border-slate-300 text-slate-500">
                            Planned
                          </Badge>
                        )}
                      </div>
                      {m.description && <p className="text-xs text-slate-500 leading-normal">{m.description}</p>}
                      {m.targetDate && (
                        <p className="text-[10px] text-slate-400">
                          Target Date: {new Date(m.targetDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
            {project.status !== "completed" ? (
              <Button asChild className="bg-[#D4A017] hover:bg-[#D4A017]/90 text-white font-medium">
                <Link to={`/donate?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}>
                  Support this project
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Link to="/projects">Back to project list</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectDetailsPage;
