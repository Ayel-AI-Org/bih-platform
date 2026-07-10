import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserCheck, Plus, X } from "lucide-react";

const CompleteProfileVolunteerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form Fields State
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please sign in first.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
          return;
        }

        setUser(user);

        // Fetch current values (if any exist)
        const { data: volProfile } = await supabase
          .from("volunteer_profiles")
          .select("phone, location, skills, availability")
          .eq("user_id", user.id)
          .maybeSingle();

        if (volProfile) {
          if (volProfile.phone && volProfile.phone !== "pending") setPhone(volProfile.phone);
          if (volProfile.location && volProfile.location !== "pending") setLocation(volProfile.location);
          if (volProfile.availability && volProfile.availability !== "pending") setAvailability(volProfile.availability);
          if (Array.isArray(volProfile.skills)) setSkills(volProfile.skills);
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate, toast]);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !location.trim() || !availability.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all the required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("volunteer_profiles")
        .update({
          phone: phone.trim(),
          location: location.trim(),
          skills: skills,
          availability: availability.trim(),
          approval_status: "pending",
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile completed successfully!",
        description: "Your registration is now submitted for administrator approval.",
      });

      navigate("/pending", { replace: true });
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message || "Could not update profile data.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-12 bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-md border-t-4 border-[#D4A017]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 text-[#D4A017]">
            <UserCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F] font-bold">Complete Volunteer Profile</CardTitle>
          <CardDescription>
            You're signed in! Just supply a few key details to activate your partner profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+233 XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location / City Region <span className="text-destructive">*</span></Label>
              <Input
                id="location"
                placeholder="Accra, Greater Accra"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-input">Skills & Expertise</Label>
              <div className="flex gap-2">
                <Input
                  id="skill-input"
                  placeholder="Type a skill and press Enter or click add"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={submitting}
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                  disabled={submitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border text-xs font-medium text-slate-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="availability">Availability <span className="text-destructive">*</span></Label>
              <Textarea
                id="availability"
                placeholder="e.g. Weekends only, 10 hours a week, Weekday evenings..."
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                rows={3}
                disabled={submitting}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2 mt-4"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Submit Registration
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfileVolunteerPage;
