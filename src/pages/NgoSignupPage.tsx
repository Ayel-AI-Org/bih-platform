import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerNgo } from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const NgoSignupPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
    phone: "",
    preferredContactChannels: [] as string[],
    alternateContact: "",
    cityRegion: "",
    yearEstablished: "",
    legalStatus: "",
    registrationAuthority: "",
    missionStatement: "",
    programsRunning: "",
    primaryBeneficiaries: "",
    geographicCoverage: "",
    teamSize: "",
    pastExperience: "",
    targetCommunities: "",
    focusArea: "",
    registrationNumber: "",
  });

  const togglePreferredContact = (value: string) => {
    setForm((prev) => ({
      ...prev,
      preferredContactChannels: prev.preferredContactChannels.includes(value)
        ? prev.preferredContactChannels.filter((item) => item !== value)
        : [...prev.preferredContactChannels, value],
    }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const generatedPassword = `BIH-${Math.random().toString(36).slice(2, 12)}!Aa1`;
      await registerNgo({ ...form, password: generatedPassword });
      toast({
        title: "Application submitted",
        description: "Your NGO registration is pending admin approval. You will receive an email once approved.",
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
            <CardTitle>NGO / Club Registration</CardTitle>
            <CardDescription>Register your organization to collaborate on projects and visibility opportunities.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">1. Organization Basics</h3>
                <p className="text-xs text-muted-foreground">Used to identify your organization and primary contact.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization name</Label>
                <Input id="organizationName" required value={form.organizationName} onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact person</Label>
                  <Input id="contactPerson" required value={form.contactPerson} onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration number</Label>
                  <Input id="registrationNumber" required value={form.registrationNumber} onChange={(event) => setForm((prev) => ({ ...prev, registrationNumber: event.target.value }))} />
                </div>
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
              <div className="pt-2 space-y-1">
                <h3 className="text-base font-semibold">2. Verification</h3>
                <p className="text-xs text-muted-foreground">Helps BIH confirm legitimacy and communication channels.</p>
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
                        onChange={() => togglePreferredContact(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alternateContact">Alternative contact</Label>
                  <Input id="alternateContact" value={form.alternateContact} onChange={(event) => setForm((prev) => ({ ...prev, alternateContact: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cityRegion">City / Region</Label>
                  <Input id="cityRegion" required value={form.cityRegion} onChange={(event) => setForm((prev) => ({ ...prev, cityRegion: event.target.value }))} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearEstablished">Year established</Label>
                  <Input id="yearEstablished" required value={form.yearEstablished} onChange={(event) => setForm((prev) => ({ ...prev, yearEstablished: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalStatus">Legal status / type</Label>
                  <Input id="legalStatus" required value={form.legalStatus} onChange={(event) => setForm((prev) => ({ ...prev, legalStatus: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationAuthority">Registration authority</Label>
                  <Input id="registrationAuthority" required value={form.registrationAuthority} onChange={(event) => setForm((prev) => ({ ...prev, registrationAuthority: event.target.value }))} />
                </div>
              </div>
              <div className="pt-2 space-y-1">
                <h3 className="text-base font-semibold">3. Programs and Fit</h3>
                <p className="text-xs text-muted-foreground">Provide impact context for approval and BIH alignment.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="focusArea">Focus area</Label>
                <Textarea id="focusArea" required value={form.focusArea} onChange={(event) => setForm((prev) => ({ ...prev, focusArea: event.target.value }))} placeholder="e.g. education, health, environment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="missionStatement">Mission statement</Label>
                <Textarea id="missionStatement" required value={form.missionStatement} onChange={(event) => setForm((prev) => ({ ...prev, missionStatement: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programsRunning">Programs currently running</Label>
                <Textarea id="programsRunning" required value={form.programsRunning} onChange={(event) => setForm((prev) => ({ ...prev, programsRunning: event.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryBeneficiaries">Primary beneficiaries</Label>
                  <Input id="primaryBeneficiaries" required value={form.primaryBeneficiaries} onChange={(event) => setForm((prev) => ({ ...prev, primaryBeneficiaries: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geographicCoverage">Geographic coverage</Label>
                  <Input id="geographicCoverage" required value={form.geographicCoverage} onChange={(event) => setForm((prev) => ({ ...prev, geographicCoverage: event.target.value }))} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team size</Label>
                  <Input id="teamSize" required value={form.teamSize} onChange={(event) => setForm((prev) => ({ ...prev, teamSize: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pastExperience">Past experience</Label>
                  <Input id="pastExperience" required value={form.pastExperience} onChange={(event) => setForm((prev) => ({ ...prev, pastExperience: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetCommunities">Target communities</Label>
                <Textarea id="targetCommunities" required value={form.targetCommunities} onChange={(event) => setForm((prev) => ({ ...prev, targetCommunities: event.target.value }))} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit">Submit NGO registration</Button>
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

export default NgoSignupPage;
