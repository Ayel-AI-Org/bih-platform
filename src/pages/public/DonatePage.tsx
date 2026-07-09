import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createDonation } from "@/database/operations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/database/client";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        channels?: string[];
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

const loadPaystackScript = () => {
  if (typeof window !== "undefined" && window.PaystackPop) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack script."));
    document.body.appendChild(script);
  });
};

const DonatePage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId")?.trim();
  const selectedProjectTitle = searchParams.get("projectTitle")?.trim();
  const selectedProjectPurpose = useMemo(
    () => (selectedProjectTitle ? `Support Project: ${selectedProjectTitle}` : "General Support"),
    [selectedProjectTitle],
  );

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    amount: "",
    currency: "GHS",
    paymentMethod: "mobile_money" as "mobile_money" | "card",
    purpose: selectedProjectPurpose,
    message: "",
  });

  useEffect(() => {
    setForm((prev) => {
      if (prev.purpose === selectedProjectPurpose) {
        return prev;
      }

      if (prev.purpose === "General Support" || prev.purpose.startsWith("Support Project:")) {
        return { ...prev, purpose: selectedProjectPurpose };
      }

      return prev;
    });
  }, [selectedProjectPurpose]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please provide a valid donation amount.", variant: "destructive" });
      return;
    }

    if (form.paymentMethod === "card") {
      toast({
        title: "Coming soon",
        description: "Card payments will be available soon. Please use Mobile Money for now.",
        variant: "destructive",
      });
      return;
    }

    if (!paystackPublicKey) {
      toast({
        title: "Paystack not configured",
        description: "Set VITE_PAYSTACK_PUBLIC_KEY in your .env file.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await loadPaystackScript();

      if (!window.PaystackPop) {
        throw new Error("Paystack SDK is unavailable.");
      }

      const txRef = `bih-${Date.now()}`;

      const handlePaymentSuccess = async (reference: string) => {
        try {
          const referenceMessage = `Paystack Ref: ${reference}`;
          const combinedMessage = form.message ? `${form.message}\n${referenceMessage}` : referenceMessage;

          // 1. Insert donation record into public.donations
          await createDonation({
            fullName: form.fullName,
            email: form.email,
            amount,
            currency: form.currency,
            paymentMethod: "mobile_money",
            purpose: form.purpose,
            message: combinedMessage,
          });

          // 2. Invoke Resend donation confirmation email via Edge Function
          try {
            await supabase.functions.invoke("donation-confirmation", {
              body: {
                email: form.email,
                fullName: form.fullName,
                currency: form.currency,
                amount: amount,
                purpose: form.purpose,
                reference: reference,
              },
            });
          } catch (emailErr) {
            console.error("Failed to trigger donation email edge function:", emailErr);
          }

          setForm({
            fullName: "",
            email: "",
            amount: "",
            currency: "GHS",
            paymentMethod: "mobile_money",
            purpose: selectedProjectPurpose,
            message: "",
          });

          toast({
            title: "Payment successful, thank you for your support!",
            description: `Donation recorded with reference ${reference}. Confirmation email receipt triggered.`,
          });
        } catch (err: any) {
          toast({
            title: "Donation logging failed",
            description: err.message || "Payment succeeded but database record failed.",
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
        }
      };

      const paystack = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: form.email,
        amount: Math.round(amount * 100),
        currency: form.currency,
        ref: txRef,
        channels: ["mobile_money"],
        metadata: {
          full_name: form.fullName,
          purpose: form.purpose,
        },
        callback: (response) => {
          void handlePaymentSuccess(response.reference);
        },
        onClose: () => {
          setSubmitting(false);
          toast({
            title: "Payment cancelled",
            description: "You closed the Paystack payment window before completing payment.",
          });
        },
      });

      paystack.openIframe();
    } catch (error) {
      setSubmitting(false);
      toast({
        title: "Donation failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-16 bg-[#F5F5F5] min-h-[85vh] flex items-center">
      <div className="container max-w-3xl">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-[#1E3A5F] text-2xl font-bold">Donation & Support</CardTitle>
            <CardDescription>
              Secure donation form with mobile money support. Confirmation email receipt is auto-sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" required disabled={submitting} value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required disabled={submitting} value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" required disabled={submitting} type="number" min={1} value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" required disabled={submitting} value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    disabled={submitting}
                    value={form.paymentMethod}
                    onValueChange={(value: "mobile_money" | "card") => setForm((prev) => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="card">Card (Coming soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedProjectTitle ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  Donating in support of <span className="font-semibold text-[#1E3A5F]">{selectedProjectTitle}</span>
                  {selectedProjectId ? <span className="text-muted-foreground"> (Ref: {selectedProjectId})</span> : null}.
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input id="purpose" required disabled={submitting} value={form.purpose} onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea id="message" disabled={submitting} value={form.message} onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))} />
              </div>

              <Button type="submit" disabled={submitting} className="bg-[#D4A017] hover:bg-[#D4A017]/90 text-white w-full sm:w-auto font-medium">
                {submitting ? "Processing..." : "Complete Donation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default DonatePage;
