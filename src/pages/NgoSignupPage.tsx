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
    focusArea: "",
    registrationNumber: "",
    password: "",
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await registerNgo(form);
      toast({
        title: "Organization registered",
        description: "Your NGO profile has been added to BIH's partner database.",
      });
      navigate("/login");
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
            <form onSubmit={onSubmit} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="focusArea">Focus area</Label>
                <Textarea id="focusArea" required value={form.focusArea} onChange={(event) => setForm((prev) => ({ ...prev, focusArea: event.target.value }))} placeholder="e.g. education, health, environment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit">Create NGO account</Button>
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
