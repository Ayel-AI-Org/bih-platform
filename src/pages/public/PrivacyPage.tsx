import { PRIVACY_POLICY_TEXT } from "@/config/legalContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export const PrivacyPage = () => {
  const data = PRIVACY_POLICY_TEXT;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPage;
