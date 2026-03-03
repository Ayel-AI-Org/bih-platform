import { FormEvent, useState } from "react";
import { suggestProject } from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SuggestProjectPage = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    timeline: "",
    submittedBy: "",
    email: "",
    phone: "",
    organization: "",
    category: "",
    expectedBudget: "",
    beneficiaries: "",
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await suggestProject({
        title: form.title,
        description: form.description,
        location: form.location,
        timeline: form.timeline,
        submittedBy: form.submittedBy,
        email: form.email,
        phone: form.phone || undefined,
        organization: form.organization || undefined,
        category: form.category || undefined,
        expectedBudget: form.expectedBudget ? Number(form.expectedBudget) : undefined,
        beneficiaries: form.beneficiaries || undefined,
      });
      setForm({
        title: "",
        description: "",
        location: "",
        timeline: "",
        submittedBy: "",
        email: "",
        phone: "",
        organization: "",
        category: "",
        expectedBudget: "",
        beneficiaries: "",
      });
      toast({
        title: "Project suggestion submitted",
        description: "Your proposal is now in BIH's admin review queue.",
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-16">
      <div className="container max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Suggest a Project</CardTitle>
            <CardDescription>
              Propose a community project idea. BIH admin will review and approve qualified submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project title</Label>
                <Input id="title" required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" required value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" required value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input id="timeline" required value={form.timeline} onChange={(event) => setForm((prev) => ({ ...prev, timeline: event.target.value }))} placeholder="e.g. Q4 2026" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submittedBy">Submitted by</Label>
                  <Input id="submittedBy" required value={form.submittedBy} onChange={(event) => setForm((prev) => ({ ...prev, submittedBy: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization (optional)</Label>
                  <Input id="organization" value={form.organization} onChange={(event) => setForm((prev) => ({ ...prev, organization: event.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Project category</Label>
                  <Input id="category" placeholder="e.g. Water, Health, Education" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedBudget">Expected budget (GHS)</Label>
                  <Input id="expectedBudget" type="number" min={0} value={form.expectedBudget} onChange={(event) => setForm((prev) => ({ ...prev, expectedBudget: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beneficiaries">Target beneficiaries</Label>
                <Textarea id="beneficiaries" placeholder="Who benefits and approximately how many people?" value={form.beneficiaries} onChange={(event) => setForm((prev) => ({ ...prev, beneficiaries: event.target.value }))} />
              </div>

              <Button type="submit">Submit for admin review</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default SuggestProjectPage;
