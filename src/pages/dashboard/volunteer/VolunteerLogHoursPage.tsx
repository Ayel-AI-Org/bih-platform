import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarRange, Loader2, Save } from "lucide-react";

const logHoursSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  activityDescription: z.string().min(1, "Activity description is required"),
  logDate: z.string().min(1, "Date is required"),
  hours: z.preprocess(
    (val) => Number(val),
    z.number().min(0.5, "Hours must be at least 0.5").max(24, "Hours cannot exceed 24")
  ),
});

type LogHoursFormValues = z.infer<typeof logHoursSchema>;

const VolunteerLogHoursPage = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LogHoursFormValues>({
    resolver: zodResolver(logHoursSchema),
    defaultValues: {
      projectId: "",
      activityDescription: "",
      logDate: todayStr,
      hours: 1,
    },
  });

  const fetchOngoingProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .eq("status", "ongoing");

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      toast({
        title: "Failed to load projects",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOngoingProjects();
  }, []);

  const handleLogHoursSubmit = async (values: LogHoursFormValues) => {
    if (values.logDate > todayStr) {
      toast({
        title: "Invalid date selected",
        description: "You cannot log volunteer hours for future dates.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated session detected.");

      const { error } = await supabase.from("commitment_logs").insert({
        volunteer_id: user.id,
        project_id: values.projectId,
        activity_description: values.activityDescription,
        log_date: values.logDate,
        hours: values.hours,
        status: "logged",
      });

      if (error) throw error;

      toast({
        title: "Hours logged successfully",
        description: "Pending NGO verification. Thank you for your commitment!",
      });

      // Clear/Reset form
      reset({
        projectId: "",
        activityDescription: "",
        logDate: todayStr,
        hours: 1,
      });
    } catch (err: any) {
      toast({
        title: "Logging failed",
        description: err.message || "Failed to log commitment hours.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Log Hours</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit your work hours for coordinator audit validation.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Commitment Ledger Entry</CardTitle>
          <CardDescription>
            Input hours worked on active projects. Entries are added to an immutable ledger and cannot be edited post-submission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleLogHoursSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="projectId">Select Project</Label>
              <Select
                disabled={submitting}
                onValueChange={(val) => setValue("projectId", val, { shouldValidate: true })}
              >
                <SelectTrigger id="projectId" className={errors.projectId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Choose an ongoing project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No ongoing projects found
                    </SelectItem>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-xs text-destructive font-medium">{errors.projectId.message}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="logDate">Date of Service</Label>
                <Input
                  id="logDate"
                  type="date"
                  max={todayStr}
                  disabled={submitting}
                  className={errors.logDate ? "border-destructive" : ""}
                  {...register("logDate")}
                />
                {errors.logDate && (
                  <p className="text-xs text-destructive font-medium">{errors.logDate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hours">Hours Committed</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  disabled={submitting}
                  className={errors.hours ? "border-destructive" : ""}
                  {...register("hours")}
                />
                {errors.hours && (
                  <p className="text-xs text-destructive font-medium">{errors.hours.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="activityDescription">Activity Details & Deliverables</Label>
              <Textarea
                id="activityDescription"
                rows={4}
                placeholder="Describe your tasks, milestones completed, or support given during these hours..."
                disabled={submitting}
                className={errors.activityDescription ? "border-destructive" : ""}
                {...register("activityDescription")}
              />
              {errors.activityDescription && (
                <p className="text-xs text-destructive font-medium">{errors.activityDescription.message}</p>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium flex gap-1.5 h-10 px-6 w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Submit Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VolunteerLogHoursPage;
