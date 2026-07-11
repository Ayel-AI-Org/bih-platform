import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/database/client";

export type UserRole = "admin" | "ngo" | "volunteer" | "donor";

interface OnboardingTutorialProps {
  role: UserRole;
  userName?: string;
}

interface TutorialStep {
  title: string;
  description: string;
  selector?: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const roleTutorials: Record<UserRole, TutorialStep[]> = {
  admin: [
    {
      title: "Command Center Overview",
      description: "Welcome to the BIH Command Center. Monitor real-time platform statistics, pending approvals, and database metric counts here.",
      selector: "a[href='/admin']",
    },
    {
      title: "Operational Summary Metrics",
      description: "This real-time control strip displays aggregate numbers for users, projects, funds raised, and pending proposals.",
      selector: "#admin-stats-cards",
    },
    {
      title: "User Management Pipelines",
      description: "Approve or reject incoming volunteer signups and NGO partner registrations to grant them platform access.",
      selector: "a[href='/admin/users']",
    },
    {
      title: "Projects Hub",
      description: "Manage global projects, update descriptions, assign partners, and audit active campaigns in the ecosystem.",
      selector: "a[href='/admin/projects']",
    },
    {
      title: "Portfolio Review",
      description: "Moderate and review volunteer portfolio showcase items before they are published to the public gallery.",
      selector: "a[href='/admin/portfolio']",
    },
    {
      title: "Hours Verification Audit",
      description: "Perform global checks on volunteer commitment logs, verify records, or void entries for strict auditing.",
      selector: "a[href='/admin/hours']",
    },
    {
      title: "Project Suggestions Vetting",
      description: "Audit community-submitted project proposals and budget requests, and convert approved ideas to live campaigns.",
      selector: "a[href='/admin/suggestions']",
    },
    {
      title: "Media Manager",
      description: "Publish news, press releases, and success stories to the media gallery to share our community's accomplishments.",
      selector: "a[href='/admin/media']",
    },
    {
      title: "Global Donations Ledger",
      description: "Audit all transactions processed through Paystack. Track donors, view amounts, and export full reports.",
      selector: "a[href='/admin/donations']",
    },
    {
      title: "Send Impact Summaries",
      description: "Auditors can click this button to trigger manual quarterly progress email dispatches to all donors in the ecosystem.",
      selector: "#admin-send-summaries-btn",
    },
  ],
  ngo: [
    {
      title: "Organization Portal Overview",
      description: "Welcome to your NGO home. Monitor your projects, metrics, and ongoing community impact here.",
      selector: "a[href='/dashboard/ngo']",
    },
    {
      title: "Organization Metrics Dashboard",
      description: "Monitor active NGO campaigns, verified service hours sum, pending logs, and volunteers engaged from this grid.",
      selector: "#ngo-stats-cards",
    },
    {
      title: "Organization Profile",
      description: "Keep your contact information, website links, and focus areas updated for volunteers and donors.",
      selector: "a[href='/dashboard/ngo/profile']",
    },
    {
      title: "Project Proposals & Management",
      description: "Submit new project proposals and manage ongoing blueprints. Volunteers will apply to these projects.",
      selector: "a[href='/dashboard/ngo/projects']",
    },
    {
      title: "Verify Volunteer Hours",
      description: "Review, approve, or void logged volunteer hours. Verified logs update the volunteer's badge rank and portfolio instantly.",
      selector: "a[href='/dashboard/ngo/verify-hours']",
    },
    {
      title: "Quick Hours Verification Queue",
      description: "Verify or reject pending logs submitted by volunteers directly from this dashboard timeline.",
      selector: "#ngo-pending-verifications",
    },
  ],
  volunteer: [
    {
      title: "Volunteer Dashboard Home",
      description: "Welcome! View your cumulative hours, current badge ranks, and quick status summaries here.",
      selector: "a[href='/dashboard/volunteer']",
    },
    {
      title: "Volunteer Action Metrics",
      description: "Monitor your verified volunteer hours, pending logs count, portfolio showcases, and badge rank progression at a glance.",
      selector: "#volunteer-stats-cards",
    },
    {
      title: "Recent Commitment Timeline",
      description: "Inspect the processing state of your most recent hours logged on projects from this activity log.",
      selector: "#volunteer-recent-logs",
    },
    {
      title: "My Profile Settings",
      description: "Manage your contact info, location details, skill tags, and upload your profile avatar.",
      selector: "a[href='/dashboard/volunteer/profile']",
    },
    {
      title: "Portfolio Showcase",
      description: "Submit showcase items, attach photos/videos, and build your public impact portfolio.",
      selector: "a[href='/dashboard/volunteer/portfolio']",
    },
    {
      title: "Log Your Hours",
      description: "Report your daily activities and logged hours on active NGO projects for coordinator verification.",
      selector: "a[href='/dashboard/volunteer/log-hours']",
    },
    {
      title: "Hours History Logs",
      description: "Access your complete hours history, checking statuses (logged, verified, voided) and NGO approvals.",
      selector: "a[href='/dashboard/volunteer/hours-history']",
    },
    {
      title: "Badges & Progress Tiers",
      description: "Track your rank progression from Newcomer to Legend as your verified service hours accumulate.",
      selector: "a[href='/dashboard/volunteer/badges']",
    },
  ],
  donor: [
    {
      title: "Donor Home Overview",
      description: "Welcome! View your lifetime donation total, active contribution count, and impact stats at a glance.",
      selector: "a[href='/dashboard/donor']",
    },
    {
      title: "Giving Dashboard Metrics",
      description: "View your total verified donations, processed donation count, and distinct social causes supported.",
      selector: "#donor-stats-cards",
    },
    {
      title: "Recent Transaction Ledger",
      description: "Audit the status of your last processed donation records securely inside this timeline widget.",
      selector: "#donor-recent-transactions",
    },
    {
      title: "Donor Profile Settings",
      description: "Update your donor classification, contact info, and select your preferred social impact interest categories.",
      selector: "a[href='/dashboard/donor/profile']",
    },
    {
      title: "Donation Ledger & Receipts",
      description: "Track your payment history. Download and print official receipts for tax or record-keeping.",
      selector: "a[href='/dashboard/donor/history']",
    },
    {
      title: "Interactive Impact View",
      description: "Track how your funds directly support live project milestones through visual maps and progress metrics.",
      selector: "a[href='/dashboard/donor/impact']",
    },
  ],
};

export const OnboardingTutorial = ({ role, userName }: OnboardingTutorialProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const storageKey = `bih-tutorial-dismissed-${role}`;
  const steps = roleTutorials[role] || [];

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("has_completed_onboarding")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (profile && !profile.has_completed_onboarding) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Failed to query onboarding flag in Supabase:", err);
        const isDismissed = localStorage.getItem(storageKey) === "true";
        if (!isDismissed && steps.length > 0) {
          setIsOpen(true);
        }
      }
    };

    checkOnboardingStatus();
  }, [role, storageKey, steps.length]);

  useEffect(() => {
    const handleRestartTour = async () => {
      setCurrentStep(0);
      setIsOpen(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ has_completed_onboarding: false })
            .eq("id", user.id);
        }
      } catch (err) {
        console.error("Failed to reset onboarding flag in Supabase:", err);
      }
    };

    window.addEventListener("bih-restart-tour", handleRestartTour);
    return () => {
      window.removeEventListener("bih-restart-tour", handleRestartTour);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      const selector = steps[currentStep]?.selector;
      if (!selector) {
        setTargetRect(null);
        return;
      }
      
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if the target element is visible and has height/width
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          return;
        }
      }
      // Graceful fallback to centered card if element is not rendered
      setTargetRect(null);
    };

    // Run layout calculation instantly
    handleUpdate();
    
    // Also attach listeners to handle scroll or resize dynamically
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isOpen, currentStep, role, steps]);

  const handleSkip = async () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ has_completed_onboarding: true })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("Failed to update onboarding flag in Supabase:", err);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Last step, complete tutorial
      handleSkip();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen || steps.length === 0) return null;

  const activeStep = steps[currentStep];

  // Responsive Positioning: Tooltip style calculation
  const getTooltipStyle = () => {
    if (!targetRect) {
      // Center Fallback when element is missing
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        width: "400px",
        maxWidth: "90vw",
        transition: "all 0.25s ease-in-out",
      };
    }

    const isLeft = targetRect.left + targetRect.width / 2 < window.innerWidth / 3;
    const fitsBelow = targetRect.top + targetRect.height + 250 < window.innerHeight;

    if (isLeft) {
      // Sidebar positioning: Anchor tooltip to the right of the sidebar item
      return {
        position: "fixed" as const,
        left: `${targetRect.left + targetRect.width + 16}px`,
        top: `${Math.max(16, Math.min(window.innerHeight - 300, targetRect.top + (targetRect.height / 2) - 100))}px`,
        zIndex: 9999,
        width: "400px",
        maxWidth: "90vw",
        transition: "all 0.25s ease-in-out",
      };
    } else if (fitsBelow) {
      // Center/Right positioning: Anchor tooltip below the target
      return {
        position: "fixed" as const,
        top: `${targetRect.top + targetRect.height + 16}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 420, targetRect.left + (targetRect.width - 400) / 2))}px`,
        zIndex: 9999,
        width: "400px",
        maxWidth: "90vw",
        transition: "all 0.25s ease-in-out",
      };
    } else {
      // Bottom overflow positioning: Anchor tooltip above the target
      return {
        position: "fixed" as const,
        top: `${Math.max(16, targetRect.top - 240)}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 420, targetRect.left + (targetRect.width - 400) / 2))}px`,
        zIndex: 9999,
        width: "400px",
        maxWidth: "90vw",
        transition: "all 0.25s ease-in-out",
      };
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none">
      {/* Spotlight highlight window around target element */}
      {targetRect ? (
        <div
          style={{
            position: "fixed",
            top: `${targetRect.top - 4}px`,
            left: `${targetRect.left - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            borderRadius: "8px",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
            border: "2px solid #D4A017",
            pointerEvents: "none",
            zIndex: 9998,
            transition: "all 0.2s ease-in-out",
          }}
        />
      ) : (
        /* Flat backdrop fallback */
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            pointerEvents: "auto",
            zIndex: 9998,
          }}
        />
      )}

      {/* Floating step tooltip card */}
      <div style={getTooltipStyle()} className="pointer-events-auto">
        <Card className="w-full shadow-2xl border-[#D4A017] border-t-4 animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="relative pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Close tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wider">
              Ecosystem Tour — Step {currentStep + 1} of {steps.length}
            </span>
            <CardTitle className="text-lg font-serif text-[#1E3A5F] mt-1 pr-6 font-bold">
              {activeStep.title}
            </CardTitle>
            {userName && currentStep === 0 && (
              <CardDescription className="text-[10px]">
                Welcome, {userName}! Let's review the active workspace features.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="py-2.5">
            <p className="text-xs text-slate-700 leading-relaxed">
              {activeStep.description}
            </p>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t pt-3 pb-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-[10px] h-8 text-muted-foreground hover:text-foreground px-2"
            >
              Skip Tour
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  size="sm"
                  className="h-7 px-2.5 text-[10px] border-slate-300 text-slate-700 hover:bg-slate-50 gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                size="sm"
                className="h-7 px-2.5 text-[10px] bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-1"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Finish <Check className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
