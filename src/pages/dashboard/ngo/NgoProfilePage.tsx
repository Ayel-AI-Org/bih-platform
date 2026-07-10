import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save } from "lucide-react";

const ngoProfileSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  focusArea: z.string().min(1, "Focus area description is required"),
  registrationNumber: z.string().optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
});

type NgoProfileFormValues = z.infer<typeof ngoProfileSchema>;

const NgoProfilePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<NgoProfileFormValues>({
    resolver: zodResolver(ngoProfileSchema),
    defaultValues: {
      organizationName: "",
      contactPerson: "",
      phone: "",
      focusArea: "",
      registrationNumber: "",
      websiteUrl: "",
      bio: "",
    },
  });

  const fetchNgoProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch profiles table details
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .maybeSingle();

      // 2. Fetch ngo_profiles details
      const { data: ngoProfile } = await supabase
        .from("ngo_profiles")
        .select("organization_name, contact_person, phone, focus_area, registration_number, website_url, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setValue("bio", profile.bio || "");
      }

      if (ngoProfile) {
        setValue("organizationName", ngoProfile.organization_name);
        setValue("contactPerson", ngoProfile.contact_person || profile?.full_name || "");
        setValue("phone", ngoProfile.phone);
        setValue("focusArea", ngoProfile.focus_area);
        setValue("registrationNumber", ngoProfile.registration_number || "");
        setValue("websiteUrl", ngoProfile.website_url || "");
        setLastUpdated(ngoProfile.updated_at);
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
    fetchNgoProfile();
  }, []);

  const handleSaveNgoProfile = async (values: NgoProfileFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      const nowIso = new Date().toISOString();

      // 1. Update profiles table (full_name acts as contact person, bio)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: values.contactPerson,
          bio: values.bio || null,
          updated_at: nowIso,
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      // 2. Update ngo_profiles details
      const { error: ngoErr } = await supabase
        .from("ngo_profiles")
        .update({
          organization_name: values.organizationName,
          contact_person: values.contactPerson,
          phone: values.phone,
          focus_area: values.focusArea,
          registration_number: values.registrationNumber || null,
          website_url: values.websiteUrl || null,
          updated_at: nowIso,
        })
        .eq("user_id", user.id);

      if (ngoErr) throw ngoErr;

      setLastUpdated(nowIso);
      toast({
        title: "NGO Profile updated",
        description: "Organization details saved successfully.",
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
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Our Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maintain your organization credentials, contact nodes, and website details.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">NGO Partner Profile Registry</CardTitle>
          <CardDescription>
            Update focus areas and organization descriptors shown to BIH review teams and volunteers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSaveNgoProfile)} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  disabled={saving}
                  className={errors.organizationName ? "border-destructive" : ""}
                  {...register("organizationName")}
                />
                {errors.organizationName && (
                  <p className="text-xs text-destructive font-medium">{errors.organizationName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactPerson">Contact Person Name</Label>
                <Input
                  id="contactPerson"
                  disabled={saving}
                  className={errors.contactPerson ? "border-destructive" : ""}
                  {...register("contactPerson")}
                />
                {errors.contactPerson && (
                  <p className="text-xs text-destructive font-medium">{errors.contactPerson.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
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

              <div className="space-y-1.5">
                <Label htmlFor="registrationNumber">NGO Registration Number (optional)</Label>
                <Input
                  id="registrationNumber"
                  placeholder="e.g. D.S.W/NGO/1234"
                  disabled={saving}
                  className={errors.registrationNumber ? "border-destructive" : ""}
                  {...register("registrationNumber")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="websiteUrl">Website URL (optional)</Label>
              <Input
                id="websiteUrl"
                placeholder="https://organization.org"
                disabled={saving}
                className={errors.websiteUrl ? "border-destructive" : ""}
                {...register("websiteUrl")}
              />
              {errors.websiteUrl && (
                <p className="text-xs text-destructive font-medium">{errors.websiteUrl.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="focusArea">Focus Area (e.g. Water Sanitation, Primary Education)</Label>
              <Input
                id="focusArea"
                disabled={saving}
                className={errors.focusArea ? "border-destructive" : ""}
                {...register("focusArea")}
              />
              {errors.focusArea && (
                <p className="text-xs text-destructive font-medium">{errors.focusArea.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Organization Mission & Background Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Provide a detailed overview of your organization's mission, target communities, and past project impact..."
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

export default NgoProfilePage;
