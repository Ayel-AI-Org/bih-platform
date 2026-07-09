import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Save } from "lucide-react";

const profileFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  location: z.string().min(1, "Location is required"),
  availability: z.enum(["Weekends", "Weekdays", "Flexible", "Full-time"]),
  bio: z.string().optional().or(z.literal("")),
  linkedinUrl: z.string().url("Must be a valid LinkedIn URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const VolunteerProfilePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      location: "",
      availability: "Flexible",
      bio: "",
      linkedinUrl: "",
    },
  });

  const fetchProfileDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch core profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .maybeSingle();

      // 2. Fetch volunteer profile details
      const { data: volProfile } = await supabase
        .from("volunteer_profiles")
        .select("phone, location, skills, availability, linkedin_url, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setValue("fullName", profile.full_name);
        setValue("bio", profile.bio || "");
      }

      if (volProfile) {
        setValue("phone", volProfile.phone);
        setValue("location", volProfile.location);
        setValue("availability", volProfile.availability as any);
        setValue("linkedinUrl", volProfile.linkedin_url || "");
        setSkills(volProfile.skills || []);
        setLastUpdated(volProfile.updated_at);
      }
    } catch (err: any) {
      toast({
        title: "Profile loading failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = newSkill.trim();
      if (trimmed && !skills.includes(trimmed)) {
        setSkills((prev) => [...prev, trimmed]);
        setNewSkill("");
      }
    }
  };

  const triggerAddSkillBtn = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSaveProfile = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      // 1. Update profiles
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: values.fullName,
          bio: values.bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      // 2. Update volunteer_profiles
      const nowIso = new Date().toISOString();
      const { error: volErr } = await supabase
        .from("volunteer_profiles")
        .update({
          phone: values.phone,
          location: values.location,
          availability: values.availability,
          linkedin_url: values.linkedinUrl || null,
          skills: skills,
          updated_at: nowIso,
        })
        .eq("user_id", user.id);

      if (volErr) throw volErr;

      setLastUpdated(nowIso);
      toast({
        title: "Profile updated",
        description: "Your volunteer registration has been successfully saved.",
      });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || "Failed to update profile records.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-[450px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maintain your skills, availability tiers, and contact channels.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Volunteer Information Dossier</CardTitle>
          <CardDescription>
            Update details to help NGO partners find you for matching campaign focus areas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSaveProfile)} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name / Display Name</Label>
                <Input
                  id="fullName"
                  disabled={saving}
                  className={errors.fullName ? "border-destructive" : ""}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive font-medium">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="e.g. +233 24 123 4567"
                  disabled={saving}
                  className={errors.phone ? "border-destructive" : ""}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive font-medium">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="location">Geographic Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Accra, Ghana"
                  disabled={saving}
                  className={errors.location ? "border-destructive" : ""}
                  {...register("location")}
                />
                {errors.location && (
                  <p className="text-xs text-destructive font-medium">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="availability">Commitment Availability</Label>
                <Select
                  disabled={saving}
                  defaultValue="Flexible"
                  onValueChange={(val: any) => setValue("availability", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="availability">
                    <SelectValue placeholder="Choose availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekends">Weekends Only</SelectItem>
                    <SelectItem value="Weekdays">Weekdays Only</SelectItem>
                    <SelectItem value="Flexible">Flexible Schedule</SelectItem>
                    <SelectItem value="Full-time">Full-time Commitment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Skills Manager */}
            <div className="space-y-2">
              <Label htmlFor="newSkill">Specialized Skills / Capabilities</Label>
              <div className="flex gap-2">
                <Input
                  id="newSkill"
                  placeholder="Type a skill (e.g. Teaching, First Aid) and press Enter"
                  disabled={saving}
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleAddSkill}
                />
                <Button
                  type="button"
                  onClick={triggerAddSkillBtn}
                  disabled={saving}
                  variant="outline"
                  className="border-slate-350 text-slate-700 h-10 px-3 flex gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {skills.length === 0 ? (
                <p className="text-[10px] text-muted-foreground mt-1">No skills registered. Register your capabilities for partner visibility.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      className="bg-slate-100 hover:bg-slate-200 text-[#1E3A5F] border border-slate-200 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-sans"
                    >
                      {skill}
                      <X
                        className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL Profile</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/username"
                disabled={saving}
                className={errors.linkedinUrl ? "border-destructive" : ""}
                {...register("linkedinUrl")}
              />
              {errors.linkedinUrl && (
                <p className="text-xs text-destructive font-medium">{errors.linkedinUrl.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Professional Bio / Overview Statement</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Describe your motivation, community background, and how you want to contribute..."
                disabled={saving}
                {...register("bio")}
              />
            </div>

            <div className="pt-2 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium flex gap-1.5 h-10 px-6 w-full sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Profile
              </Button>
              {lastUpdated && (
                <span className="text-[10px] text-muted-foreground font-sans">
                  Last updated: {new Date(lastUpdated).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VolunteerProfilePage;
