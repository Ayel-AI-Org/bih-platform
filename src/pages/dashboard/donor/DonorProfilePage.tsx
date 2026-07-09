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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Save } from "lucide-react";

const donorProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  donorType: z.enum(["Individual", "Organisation", "Foundation"]),
});

type DonorProfileFormValues = z.infer<typeof donorProfileSchema>;

const DonorProfilePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DonorProfileFormValues>({
    resolver: zodResolver(donorProfileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      donorType: "Individual",
    },
  });

  const fetchDonorProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch core profiles details
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      // 2. Fetch donor_profiles details
      const { data: donorProfile } = await supabase
        .from("donor_profiles")
        .select("phone, donor_type, interests, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setValue("fullName", profile.full_name);
      }

      if (donorProfile) {
        setValue("phone", donorProfile.phone || "");
        setValue("donorType", (donorProfile.donor_type || "Individual") as any);
        setInterests(donorProfile.interests || []);
        setLastUpdated(donorProfile.updated_at);
      }
    } catch (err: any) {
      toast({
        title: "Failed to load profile details",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorProfile();
  }, []);

  const handleAddInterest = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = newInterest.trim();
      if (trimmed && !interests.includes(trimmed)) {
        setInterests((prev) => [...prev, trimmed]);
        setNewInterest("");
      }
    }
  };

  const triggerAddInterestBtn = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed]);
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests((prev) => prev.filter((i) => i !== interestToRemove));
  };

  const handleSaveDonorProfile = async (values: DonorProfileFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      const nowIso = new Date().toISOString();

      // 1. Update profiles
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: values.fullName,
          updated_at: nowIso,
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      // 2. Update donor_profiles
      const { error: donorErr } = await supabase
        .from("donor_profiles")
        .update({
          phone: values.phone,
          donor_type: values.donorType,
          interests: interests,
          updated_at: nowIso,
        })
        .eq("user_id", user.id);

      if (donorErr) throw donorErr;

      setLastUpdated(nowIso);
      toast({
        title: "Profile saved",
        description: "Your donor profile details have been successfully updated.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save profile",
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
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maintain your donor classification, interest causes, and contact channels.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Donor Partner Profile Registry</CardTitle>
          <CardDescription>
            Tailor your profile type and cause categories to receive filtered impact summaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSaveDonorProfile)} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name / Organization Name</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="donorType">Donor Account Classification</Label>
              <Select
                disabled={saving}
                defaultValue="Individual"
                onValueChange={(val: any) => setValue("donorType", val, { shouldValidate: true })}
              >
                <SelectTrigger id="donorType">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual Donor</SelectItem>
                  <SelectItem value="Organisation">Corporate Organisation</SelectItem>
                  <SelectItem value="Foundation">Philanthropic Foundation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Interest Tags Selector */}
            <div className="space-y-2">
              <Label htmlFor="newInterest">Interests / Focus Causes</Label>
              <div className="flex gap-2">
                <Input
                  id="newInterest"
                  placeholder="Type an interest (e.g. Clean Water, Sanitation) and press Enter"
                  disabled={saving}
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={handleAddInterest}
                />
                <Button
                  type="button"
                  onClick={triggerAddInterestBtn}
                  disabled={saving}
                  variant="outline"
                  className="border-slate-350 text-slate-700 h-10 px-3 flex gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {interests.length === 0 ? (
                <p className="text-[10px] text-muted-foreground mt-1">No interests registered. Log causes to tailor impact updates.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {interests.map((interest) => (
                    <Badge
                      key={interest}
                      className="bg-slate-100 hover:bg-slate-200 text-[#1E3A5F] border border-slate-200 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-sans"
                    >
                      {interest}
                      <X
                        className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-655"
                        onClick={() => handleRemoveInterest(interest)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
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

export default DonorProfilePage;
