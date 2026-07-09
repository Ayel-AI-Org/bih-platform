import { FormEvent, useState } from "react";
import { suggestProject } from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

const SuggestProjectPage = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);

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

      // Invoke Resend confirmation email via Supabase Edge Function
      try {
        await supabase.functions.invoke("suggestion-confirmation", {
          body: {
            email: form.email,
            name: form.submittedBy,
            title: form.title,
          },
        });
      } catch (emailErr) {
        console.error("Failed to trigger suggestion confirmation email:", emailErr);
      }

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
        description: "Your proposal is now in BIH's admin review queue and a confirmation email has been sent.",
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-[#F5F5F5] min-h-[85vh] flex items-center">
      <div className="container max-w-3xl">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-[#1E3A5F] text-2xl font-bold">Suggest a Project</CardTitle>
            <CardDescription>
              Propose a community project idea. BIH admin will review and approve qualified submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input id="title" required disabled={submitting} value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" required disabled={submitting} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" required disabled={submitting} value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input id="timeline" required disabled={submitting} value={form.timeline} onChange={(event) => setForm((prev) => ({ ...prev, timeline: event.target.value }))} placeholder="e.g. Q4 2026" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submittedBy">Submitted by</Label>
                  <Input id="submittedBy" required disabled={submitting} value={form.submittedBy} onChange={(event) => setForm((prev) => ({ ...prev, submittedBy: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required disabled={submitting} value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" disabled={submitting} value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization (optional)</Label>
                  <Input id="organization" disabled={submitting} value={form.organization} onChange={(event) => setForm((prev) => ({ ...prev, organization: event.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Project category (optional)</Label>
                  <Input id="category" placeholder="e.g. Water, Health, Education" disabled={submitting} value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedBudget">Expected budget (GHS, optional)</Label>
                  <Input id="expectedBudget" type="number" min={0} disabled={submitting} value={form.expectedBudget} onChange={(event) => setForm((prev) => ({ ...prev, expectedBudget: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beneficiaries">Target beneficiaries (optional)</Label>
                <Textarea id="beneficiaries" placeholder="Who benefits and approximately how many people?" disabled={submitting} value={form.beneficiaries} onChange={(event) => setForm((prev) => ({ ...prev, beneficiaries: event.target.value }))} />
              </div>

              <Button type="submit" disabled={submitting} className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white w-full sm:w-auto">
                {submitting ? "Submitting..." : "Submit for admin review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default SuggestProjectPage;
