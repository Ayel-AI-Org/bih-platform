import { PRIVACY_POLICY_TEXT } from "@/config/legalContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useConsent } from "@/context/ConsentContext";

export const PrivacyPage = () => {
  const data = PRIVACY_POLICY_TEXT;
  const { openPreferences } = useConsent();

  return (
    <div className="flex-1 bg-slate-50 py-10 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b pb-4 border-slate-200">
          <div className="h-10 w-10 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-[#1E3A5F] font-bold">BIH Compliance Registry</h1>
            <p className="text-xs text-muted-foreground">Bridge for Impact Hub Legal Documents</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader className="border-b border-slate-100 pb-6 bg-[#1E3A5F]/5">
            <div className="border-l-4 border-[#D4A017] pl-3">
              <CardTitle className="text-xl md:text-2xl font-serif text-[#1E3A5F] font-bold">
                {data.title}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Effective Date: {data.effectiveDate}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-sm text-slate-700 leading-relaxed font-sans">
            <p className="text-slate-800 font-medium">
              {data.introduction}
            </p>

            {data.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-base font-serif text-[#1E3A5F] font-bold border-b pb-1 border-slate-100">
                  {section.heading}
                </h3>
                <p>{section.content}</p>
              </div>
            ))}

            <div className="mt-8 pt-6 border-t border-slate-200 bg-slate-50 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[#1E3A5F]">Your Cookie & Data Choices</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  You can change your consent preferences or withdraw optional analytics permission at any time.
                </p>
              </div>
              <Button
                type="button"
                onClick={openPreferences}
                variant="outline"
                className="shrink-0 flex items-center gap-2 border-[#1E3A5F]/20 text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Manage Cookie Preferences</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPage;
