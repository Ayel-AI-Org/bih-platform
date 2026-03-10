import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerVolunteer } from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const VolunteerSignupPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    preferredContactChannels: [] as string[],
    nationality: "",
    cityRegion: "",
    availabilityBlocks: [] as string[],
    startDate: "",
    commitmentDuration: "",
    canTravel: false,
    maxTravelDistanceKm: "",
    primarySkillCategories: [] as string[],
    yearsOfExperience: "",
    languagesSpoken: "",
    pastExperience: "",
    targetCommunities: "",
    skills: "",
    availability: "",
    dataPrivacyConsent: false,
  });

  const toggleArrayValue = (key: "preferredContactChannels" | "availabilityBlocks" | "primarySkillCategories", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const generatedPassword = `BIH-${Math.random().toString(36).slice(2, 12)}!Aa1`;
      await registerVolunteer({
        ...form,
        password: generatedPassword,
        maxTravelDistanceKm: form.maxTravelDistanceKm ? Number(form.maxTravelDistanceKm) : undefined,
      });
      toast({
        title: "Application submitted",
        description: "Your volunteer application is pending admin approval. You will receive an email once approved.",
      });
      navigate("/register");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-16">
      <div className="container max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Volunteer Sign-up</CardTitle>
            <CardDescription>Join BIH and get connected to initiatives where your time and skills matter.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">1. Basic Details</h3>
                <p className="text-xs text-muted-foreground">Used by BIH admins to identify and contact you for approval.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" required value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" required value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
              </div>
              <div className="pt-2 space-y-1">
                <h3 className="text-base font-semibold">2. ID and Verification</h3>
                <p className="text-xs text-muted-foreground">Helps us verify location and communication preferences.</p>
              </div>
              <div className="space-y-2">
                <Label>Preferred contact channels (optional)</Label>
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    ["phone", "Phone"],
                    ["email", "Email"],
                    ["whatsapp", "WhatsApp"],
                  ].map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Preferred contact: ${label}`}
                        checked={form.preferredContactChannels.includes(value)}
                        onChange={() => toggleArrayValue("preferredContactChannels", value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" required value={form.nationality} onChange={(event) => setForm((prev) => ({ ...prev, nationality: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cityRegion">City / Region</Label>
                  <Input id="cityRegion" required value={form.cityRegion} onChange={(event) => setForm((prev) => ({ ...prev, cityRegion: event.target.value }))} />
                </div>
              </div>
              <div className="pt-2 space-y-1">
                <h3 className="text-base font-semibold">3. Skills and Fit</h3>
                <p className="text-xs text-muted-foreground">Tell us where you can contribute most effectively.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Textarea id="skills" required value={form.skills} onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Primary skill categories</Label>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {["teaching", "health outreach", "logistics", "media", "tech", "project support"].map((value) => (
                    <label key={value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Skill category: ${value}`}
                        checked={form.primarySkillCategories.includes(value)}
                        onChange={() => toggleArrayValue("primarySkillCategories", value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of experience</Label>
                  <Input id="yearsOfExperience" required value={form.yearsOfExperience} onChange={(event) => setForm((prev) => ({ ...prev, yearsOfExperience: event.target.value }))} placeholder="e.g. 1-2 years" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="languagesSpoken">Languages spoken</Label>
                  <Input id="languagesSpoken" required value={form.languagesSpoken} onChange={(event) => setForm((prev) => ({ ...prev, languagesSpoken: event.target.value }))} placeholder="e.g. English, Twi" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pastExperience">Past volunteering experience</Label>
                <Textarea id="pastExperience" required value={form.pastExperience} onChange={(event) => setForm((prev) => ({ ...prev, pastExperience: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetCommunities">Target communities you want to support</Label>
                <Textarea id="targetCommunities" required value={form.targetCommunities} onChange={(event) => setForm((prev) => ({ ...prev, targetCommunities: event.target.value }))} />
              </div>
              <div className="pt-2 space-y-1">
                <h3 className="text-base font-semibold">4. Commitment</h3>
                <p className="text-xs text-muted-foreground">Set expectations for timeline, schedule, and mobility.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Input id="availability" required value={form.availability} onChange={(event) => setForm((prev) => ({ ...prev, availability: event.target.value }))} placeholder="e.g. weekends, evenings" />
              </div>
              <div className="space-y-2">
                <Label>Available days/time blocks</Label>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {["weekdays-morning", "weekdays-evening", "weekends-morning", "weekends-evening"].map((value) => (
                    <label key={value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Availability block: ${value}`}
                        checked={form.availabilityBlocks.includes(value)}
                        onChange={() => toggleArrayValue("availabilityBlocks", value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date availability</Label>
                  <Input id="startDate" type="date" required value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commitmentDuration">Commitment duration</Label>
                  <Input id="commitmentDuration" required value={form.commitmentDuration} onChange={(event) => setForm((prev) => ({ ...prev, commitmentDuration: event.target.value }))} placeholder="e.g. 3-6 months" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="Can travel"
                      checked={form.canTravel}
                      onChange={(event) => setForm((prev) => ({ ...prev, canTravel: event.target.checked }))}
                    />
                    Can travel
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTravelDistanceKm">Max travel distance (km)</Label>
                  <Input id="maxTravelDistanceKm" type="number" min={0} value={form.maxTravelDistanceKm} onChange={(event) => setForm((prev) => ({ ...prev, maxTravelDistanceKm: event.target.value }))} />
                </div>
              </div>
              <div className="pt-2 space-y-1">
                <h3 className="text-base font-semibold">5. Consent</h3>
                <p className="text-xs text-muted-foreground">Required before BIH can process your registration request.</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    aria-label="Data privacy consent"
                    checked={form.dataPrivacyConsent}
                    onChange={(event) => setForm((prev) => ({ ...prev, dataPrivacyConsent: event.target.checked }))}
                    required
                  />
                  I consent to BIH data/privacy policy for review and approval processing.
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit">Submit volunteer registration</Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/register">Back to registration options</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default VolunteerSignupPage;
