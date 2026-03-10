import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSession, login, logout } from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [existingSession, setExistingSession] = useState<Awaited<ReturnType<typeof getSession>>>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const run = async () => {
      try {
        const session = await getSession();
        setExistingSession(session);
      } finally {
        setIsSessionLoading(false);
      }
    };

    run();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const session = await login(form.email, form.password);
      if (session.role !== "admin") {
        await logout();
        setExistingSession(null);
        toast({
          title: "Admin access only",
          description: "This login page is reserved for BIH administrators.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      toast({ title: "Login successful", description: `Welcome back, ${session.name}.` });
      setExistingSession(session);

      const redirectPath = typeof location.state === "object" && location.state && "from" in location.state
        ? String((location.state as { from?: string }).from)
        : "/admin";

      navigate(redirectPath);
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    setExistingSession(null);
    toast({ title: "Logged out", description: "Your session has been cleared." });
    navigate("/");
  };

  return (
    <section className="py-16">
      <div className="container max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              This login is for BIH administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSessionLoading ? (
              <p className="text-sm text-muted-foreground">Checking current session...</p>
            ) : existingSession ? (
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm">
                  Signed in as <span className="font-medium">{existingSession.name}</span> ({existingSession.role})
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingSession.role === "admin" ? (
                    <Button asChild>
                      <Link to="/admin">Continue</Link>
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={handleLogout}>Logout</Button>
                </div>
                {existingSession.role !== "admin" ? (
                  <p className="text-xs text-muted-foreground">
                    Non-admin accounts cannot use this route. Public login is coming soon.
                  </p>
                ) : null}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
                <Button type="submit">Login</Button>
              </form>
            )}

            <p className="text-sm text-muted-foreground">
              Public login for volunteers, NGOs, and donors is coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default LoginPage;
