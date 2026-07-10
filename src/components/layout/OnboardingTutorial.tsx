import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

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
      description: "Welcome to the BIH Command Center. Monitor real-time system growth, pending requests, and platform statistics here.",
      selector: "a[href='/admin']",
    },
    {
      title: "User Management Pipelines",
      description: "Navigate to User Management to review incoming volunteer logs, approve new NGO profiles, or override logged decisions.",
      selector: "a[href='/admin/users']",
    },
    {
      title: "Project & Financials",
      description: "Manage active projects and review the absolute source of truth via the CSV-exportable Donations ledger.",
      selector: "a[href='/admin/donations']",
    },
    {
      title: "Suggestions & Media Management",
      description: "Review public project suggestions submitted by the community and publish news/impact stories using the Media Manager.",
      selector: "a[href='/admin/suggestions']",
    },
  ],
  ngo: [
    {
      title: "Organization Portal Overview",
      description: "Welcome to your Organization Portal. Track your organization's active projects and overall impact metrics at a glance.",
      selector: "a[href='/dashboard/ngo']",
    },
    {
      title: "Verify Volunteer Hours",
      description: "Go to 'Verify Hours' to review, approve, or void time logs submitted by volunteers working on your projects. Your verification updates their portfolio instantly.",
      selector: "a[href='/dashboard/ngo/verify-hours']",
    },
    {
      title: "Manage Projects & Profile",
      description: "Manage your organization's active projects, create new blueprints, and keep your public NGO profile updated so volunteers and donors can find you.",
      selector: "a[href='/dashboard/ngo/projects']",
    },
  ],
  volunteer: [
    {
      title: "Log Your Hours",
      description: "Ready to build your impact portfolio? Use the 'Log Hours' feature to report your contributions and activities on active projects.",
      selector: "a[href='/dashboard/volunteer/log-hours']",
    },
    {
      title: "Badges & Progression Tiers",
      description: "Track your hours history and watch your rank climb from Newcomer to Legend as your hours are verified by partner NGOs.",
      selector: "a[href='/dashboard/volunteer/badges']",
    },
    {
      title: "Portfolio & Profile Setup",
      description: "Create, edit, and submit showcase items to your public portfolio to highlight your achievements, and update your skills or availability under My Profile.",
      selector: "a[href='/dashboard/volunteer/portfolio']",
    },
  ],
  donor: [
    {
      title: "Interactive Impact View",
      description: "See your generosity in action. Your Impact View map links your transactions directly with live project milestones.",
      selector: "a[href='/dashboard/donor/impact']",
    },
    {
      title: "Printable Donation Receipts",
      description: "Access your complete giving history and instantly print official receipts for tax or record-keeping purposes.",
      selector: "a[href='/dashboard/donor/history']",
    },
    {
      title: "Overview & Interests Profile",
      description: "Get an overview of your aggregate contributions, and keep your interests and contact info updated under My Profile.",
      selector: "a[href='/dashboard/donor']",
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
    // Check if the user has already dismissed or completed the tutorial for this role
    const isDismissed = localStorage.getItem(storageKey) === "true";
    if (!isDismissed && steps.length > 0) {
      setIsOpen(true);
    }
  }, [role, storageKey, steps.length]);

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

  const handleSkip = () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
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
