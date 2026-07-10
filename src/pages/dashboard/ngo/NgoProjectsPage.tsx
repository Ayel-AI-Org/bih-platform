import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Eye, Info } from "lucide-react";
import type { ProjectStatus } from "@/database/types";

interface ProjectItem {
  id: string;
  title: string;
  status: ProjectStatus;
  location: string;
  timeline: string;
  volunteersCount: number;
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

const NgoProjectsPage = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNgoProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch NGO's Projects
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("id, title, status, location, timeline")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (projErr) throw projErr;

      if (!projData || projData.length === 0) {
        setProjects([]);
        return;
      }

      const projectIds = projData.map((p) => p.id);

      // 2. Fetch all logs to compute volunteer counts per project
      const { data: logsData, error: logsErr } = await supabase
        .from("commitment_logs")
        .select("project_id, volunteer_id")
        .in("project_id", projectIds);

      if (logsErr) throw logsErr;

      // Map volunteer counts
      const mappedProjects = projData.map((proj) => {
        const matchingLogs = (logsData || []).filter((log) => log.project_id === proj.id);
        const uniqueVolunteers = new Set(matchingLogs.map((log) => log.volunteer_id));

        return {
          id: proj.id,
          title: proj.title,
          status: proj.status as ProjectStatus,
          location: proj.location,
          timeline: proj.timeline || "TBD",
          volunteersCount: uniqueVolunteers.size,
        };
      });

      setProjects(mappedProjects);
    } catch (err: any) {
      toast({
        title: "Projects loading failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoProjects();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Our Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and audit the campaigns and community projects owned by your organization.
        </p>
      </div>

      {/* Admin Notice Strip */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 flex gap-3 text-xs text-slate-650 items-start">
        <Info className="h-4 w-4 text-[#1E3A5F] flex-shrink-0 mt-0.5" />
        <p>
          <strong>Notice:</strong> Project creation, removal, and details edits are managed directly by the BIH administration. 
          Please contact the support team to register new projects or adjust existing timelines and locations.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Organization Projects Portfolio</CardTitle>
          <CardDescription>
            Historical ledger of campaigns created under your coordinator authorization credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm">No campaigns registered. Contact BIH admin to associate projects with your account.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Project Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Volunteers Engaged</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((proj) => (
                      <TableRow key={proj.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="font-semibold text-slate-800">{proj.title}</TableCell>
                        <TableCell className="text-slate-600">{proj.location}</TableCell>
                        <TableCell className="text-slate-500 font-sans">{proj.timeline}</TableCell>
                        <TableCell className="font-bold text-slate-700 font-mono pl-6">
                          {proj.volunteersCount}
                        </TableCell>
                        <TableCell>
                          <Badge className={`capitalize border-none text-[9px] font-bold py-0.5 px-2 ${statusTone[proj.status]}`}>
                            {statusLabel[proj.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[#1E3A5F] hover:bg-slate-100 flex gap-1 items-center ml-auto w-fit">
                            <Link to={`/projects/${proj.id}`}>
                              <Eye className="h-3.5 w-3.5" /> View details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 space-y-3.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-slate-800">{proj.title}</h4>
                      <Badge className={`capitalize border-none text-[8px] font-bold py-0.5 px-2 ${statusTone[proj.status]}`}>
                        {statusLabel[proj.status]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 font-sans">
                      <p>Location: <span className="text-slate-700 font-medium">{proj.location}</span></p>
                      <p>Timeline: <span className="text-slate-700 font-medium">{proj.timeline}</span></p>
                      <p>Volunteers Engaged: <strong className="text-slate-700 font-mono">{proj.volunteersCount}</strong></p>
                    </div>
                    <div className="pt-2 border-t flex justify-end">
                      <Button asChild size="sm" variant="outline" className="h-8 w-full text-xs text-[#1E3A5F] border-slate-200">
                        <Link to={`/projects/${proj.id}`} className="flex gap-1 items-center justify-center">
                          <Eye className="h-4 w-4" /> View Campaign Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NgoProjectsPage;
