import { useState, useEffect } from "react";
import { Link } from "react-hook-form"; // Wait, we should use standard Link from react-router-dom!
import { Link as RouterLink } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, CheckCircle, Info, Star } from "lucide-react";
import type { ProjectStatus } from "@/database/types";

interface ImpactProject {
  id: string;
  title: string;
  description: string;
  location: string;
  status: ProjectStatus;
  imageUrl: string;
  completedMilestones: number;
  totalMilestones: number;
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

const DonorImpactPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    causesCount: 0,
    totalDonated: 0,
  });
  const [impactProjects, setImpactProjects] = useState<ImpactProject[]>([]);

  const fetchDonorImpact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch successful donations
      const { data: donations, error: donErr } = await supabase
        .from("donations")
        .select("amount, purpose")
        .eq("donor_id", user.id)
        .eq("status", "success");

      if (donErr) throw donErr;

      const totalDonatedAmount = (donations || []).reduce((sum, d) => sum + Number(d.amount), 0);
      const uniquePurposes = new Set((donations || []).map((d) => d.purpose?.trim()).filter(Boolean));

      setSummary({
        causesCount: uniquePurposes.size,
        totalDonated: totalDonatedAmount,
      });

      if (!donations || donations.length === 0) {
        setImpactProjects([]);
        return;
      }

      // 2. Fetch all Projects from DB
      const { data: projectsData, error: projErr } = await supabase
        .from("projects")
        .select("id, title, description, location, status, image_url");

      if (projErr) throw projErr;

      // Filter projects that match the purpose fields of the donor's donations
      const matchingProjects = (projectsData || []).filter((proj) => {
        return (donations || []).some((don) => {
          const purposeLower = (don.purpose || "").toLowerCase();
          const titleLower = proj.title.toLowerCase();
          return (
            purposeLower.includes(titleLower) ||
            titleLower.includes(purposeLower) ||
            purposeLower.includes(proj.id.toLowerCase())
          );
        });
      });

      if (matchingProjects.length === 0) {
        setImpactProjects([]);
        return;
      }

      // 3. Fetch milestones for these matching projects
      const projectIds = matchingProjects.map((p) => p.id);
      const { data: milestonesData, error: milesErr } = await supabase
        .from("milestones")
        .select("project_id, completed_at")
        .in("project_id", projectIds);

      if (milesErr) throw milesErr;

      // Map matching projects with milestone progress
      const mappedImpact = matchingProjects.map((proj) => {
        const projMilestones = (milestonesData || []).filter((m) => m.project_id === proj.id);
        const completed = projMilestones.filter((m) => m.completed_at !== null).length;

        return {
          id: proj.id,
          title: proj.title,
          description: proj.description,
          location: proj.location,
          status: proj.status as ProjectStatus,
          imageUrl: proj.image_url || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=700&q=80",
          completedMilestones: completed,
          totalMilestones: projMilestones.length,
        };
      });

      setImpactProjects(mappedImpact);
    } catch (err: any) {
      toast({
        title: "Impact loading failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorImpact();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">My Impact</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review the real-world community milestones enabled by your financial donations.
        </p>
      </div>

      {/* Top Impact Summary Panel */}
      <Card className="bg-[#1E3A5F] text-white border-none shadow-md overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[#D4A017]/10 skew-x-12 transform origin-top-right hidden sm:block" />
        <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-serif font-bold">
              Your contributions have supported {summary.causesCount} {summary.causesCount === 1 ? "cause" : "causes"}
            </h2>
            <p className="text-slate-205 text-xs max-w-lg leading-relaxed">
              Your philanthropy fuels construction, water purification, healthcare materials support, and educational programs across the BIH ecosystem.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-5 text-center min-w-[160px] border border-white/20">
            <span className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold block mb-1">
              Total Contributed
            </span>
            <span className="text-2xl font-bold font-mono text-[#D4A017]">
              GHS {summary.totalDonated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Impact Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-serif text-[#1E3A5F] font-bold">Supported Projects & Milestones</h3>
        
        {impactProjects.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/50">
            <CardContent className="py-16 text-center text-muted-foreground space-y-4">
              <Info className="h-8 w-8 text-slate-400 mx-auto" />
              <div className="space-y-1.5 max-w-sm mx-auto text-xs">
                <p className="font-semibold text-slate-700">No matching projects matched your donation purpose.</p>
                <p className="text-slate-500">
                  Your donations support BIH's active community initiatives. Browse our active campaigns to target specific projects.
                </p>
              </div>
              <Button asChild className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium text-xs">
                <RouterLink to="/projects">Browse projects</RouterLink>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {impactProjects.map((proj) => {
              const progressPercent =
                proj.totalMilestones > 0
                  ? (proj.completedMilestones / proj.totalMilestones) * 100
                  : 0;

              return (
                <Card key={proj.id} className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
                  <div>
                    <img src={proj.imageUrl} alt={proj.title} className="h-40 w-full object-cover bg-slate-100 border-b" />
                    <CardHeader className="space-y-2.5 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base font-serif text-[#1E3A5F] font-bold line-clamp-2">
                          {proj.title}
                        </CardTitle>
                        <Badge className={`capitalize border-none text-[8px] font-bold py-0.5 px-2 ${statusTone[proj.status]}`}>
                          {statusLabel[proj.status]}
                        </Badge>
                      </div>
                      <p className="flex gap-1 text-[10px] text-slate-400"><MapPin className="h-3.5 w-3.5" /> {proj.location}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed pt-1">
                        {proj.description}
                      </p>
                    </CardHeader>
                  </div>
                  <CardContent className="pt-2 pb-6 space-y-3">
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="font-medium flex gap-1 items-center"><Star className="h-3.5 w-3.5 text-[#D4A017] fill-[#D4A017]" /> Milestones tracking</span>
                        <span className="font-mono">
                          {proj.completedMilestones} / {proj.totalMilestones} Completed
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-1.5 bg-slate-100" indicatorClassName="bg-[#6B8E3E]" />
                    </div>
                    <Button asChild variant="outline" className="w-full text-xs h-8 border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50 mt-1">
                      <RouterLink to={`/projects/${proj.id}`}>View project details</RouterLink>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Donate Again CTA */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center space-y-4 max-w-lg mx-auto mt-6">
        <h4 className="font-serif text-[#1E3A5F] font-bold text-base">Make another contribution</h4>
        <p className="text-xs text-slate-655 max-w-xs mx-auto">
          Your donations keep clean water flowing, build clinics, and supply education materials.
        </p>
        <Button asChild className="bg-[#D4A017] hover:bg-[#D4A017]/90 text-white font-medium text-xs h-9 px-6">
          <RouterLink to="/donate">Donate Now</RouterLink>
        </Button>
      </div>
    </div>
  );
};

export default DonorImpactPage;
