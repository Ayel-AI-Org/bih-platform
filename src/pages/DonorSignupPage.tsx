import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerDonor } from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DonorSignupPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    donorType: "individual" as "individual" | "organization",
    interests: "",
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const generatedPassword = `BIH-${Math.random().toString(36).slice(2, 12)}!Aa1`;
      await registerDonor({ ...form, password: generatedPassword });
      toast({
        title: "Application submitted",
        description: "Your donor registration is pending admin approval. You will receive an email once approved.",
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
            <CardTitle>Donor Registration</CardTitle>
            <CardDescription>Create your donor account to support BIH projects and initiatives.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
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
                <Label>Donor type</Label>
                <Select value={form.donorType} onValueChange={(value: "individual" | "organization") => setForm((prev) => ({ ...prev, donorType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="organization">Organization / Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interests">Areas of interest</Label>
                <Textarea id="interests" required value={form.interests} onChange={(event) => setForm((prev) => ({ ...prev, interests: event.target.value }))} placeholder="e.g. education, emergency response, women empowerment" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit">Submit donor registration</Button>
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

export default DonorSignupPage;
