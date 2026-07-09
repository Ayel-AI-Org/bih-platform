import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award, Compass, Star, Trophy, Sparkles, ChevronRight } from "lucide-react";

interface BadgeLevelConfig {
  name: string;
  minHours: number;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const levels: BadgeLevelConfig[] = [
  {
    name: "Newcomer",
    minHours: 0,
    icon: Compass,
    color: "#6B8E3E", // Olive green
    description: "Welcome to BIH! Start logging your verified hours to rise through the tiers.",
  },
  {
    name: "Contributor",
    minHours: 10,
    icon: Star,
    color: "#D4A017", // Gold
    description: "An active supporter driving local change and helping our projects move forward.",
  },
  {
    name: "Champion",
    minHours: 50,
    icon: Award,
    color: "#1E3A5F", // Navy
    description: "A seasoned helper exhibiting long-term dedication to BIH and partner projects.",
  },
  {
    name: "Impact Leader",
    minHours: 150,
    icon: Trophy,
    color: "#C8601A", // Terracotta
    description: "An exemplary lead coordinator organizing cohorts and mobilizing new support.",
  },
  {
    name: "Legend",
    minHours: 500,
    icon: Sparkles,
    color: "#7D3C98", // Purple accent
    description: "An elite veteran holding unmatched service hours and transforming communities.",
  },
];

const VolunteerBadgesPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verifiedHours, setVerifiedHours] = useState(0);
  const [dbBadgeLevel, setDbBadgeLevel] = useState("Newcomer");

  const fetchBadgeProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch total verified hours from logs
      const { data: logs } = await supabase
        .from("commitment_logs")
        .select("hours")
        .eq("volunteer_id", user.id)
        .eq("status", "verified");

      const hoursSum = (logs || []).reduce((sum, l) => sum + Number(l.hours), 0);
      setVerifiedHours(hoursSum);

      // 2. Fetch volunteer profile details
      const { data: volProfile } = await supabase
        .from("volunteer_profiles")
        .select("badge_level")
        .eq("user_id", user.id)
        .maybeSingle();

      const profileLevel = volProfile?.badge_level || "Newcomer";
      setDbBadgeLevel(profileLevel);

      // 3. Compute correct level based on hours sum
      let calculatedLevel = "Newcomer";
      for (const level of levels) {
        if (hoursSum >= level.minHours) {
          calculatedLevel = level.name;
        }
      }

      // 4. Sync profile level to database if mismatch occurs
      if (calculatedLevel !== profileLevel) {
        const { error: syncErr } = await supabase
          .from("volunteer_profiles")
          .update({ badge_level: calculatedLevel })
          .eq("user_id", user.id);

        if (syncErr) throw syncErr;
        setDbBadgeLevel(calculatedLevel);

        toast({
          title: "Badge level updated!",
          description: `Congratulations! Your new badge status is "${calculatedLevel}".`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Badges load failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadgeProgress();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Find index of current computed level
  const currentIdx = levels.findIndex((l) => l.name === dbBadgeLevel);
  const currentLevel = levels[currentIdx] || levels[0];
  const nextLevel = currentIdx < levels.length - 1 ? levels[currentIdx + 1] : null;

  // Calculate progress toward next tier
  let progressPercent = 100;
  let hoursNeededForNext = 0;

  if (nextLevel) {
    const rangeMin = currentLevel.minHours;
    const rangeMax = nextLevel.minHours;
    const currentProgress = verifiedHours - rangeMin;
    const rangeTotal = rangeMax - rangeMin;
    progressPercent = Math.min(100, Math.max(0, (currentProgress / rangeTotal) * 100));
    hoursNeededForNext = rangeMax - verifiedHours;
  }

  const ActiveIcon = currentLevel.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">My Badges</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your achievements and level milestones as a BIH helper.
        </p>
      </div>

      {/* Main Badge display */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <div className="bg-[#1E3A5F]/5 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border-b border-slate-100">
          <div className="h-24 w-24 rounded-full bg-white shadow-md flex items-center justify-center border-4 border-[#D4A017] flex-shrink-0 animate-bounce-subtle">
            <ActiveIcon className="h-12 w-12 text-[#D4A017]" />
          </div>
          <div className="space-y-2 text-center md:text-left flex-1">
            <Badge className="bg-[#D4A017] text-white hover:bg-[#D4A017]/90 border-none font-bold uppercase tracking-wider text-[10px]">
              Active Tier
            </Badge>
            <h2 className="text-2xl font-serif font-bold text-[#1E3A5F]">{currentLevel.name}</h2>
            <p className="text-xs text-slate-650 max-w-xl leading-relaxed">{currentLevel.description}</p>
            <p className="text-xs text-slate-500 pt-1">
              Verified Experience Log: <strong className="font-mono text-[#1E3A5F]">{verifiedHours.toFixed(1)} h</strong>
            </p>
          </div>
        </div>

        {/* Progress Bar Container */}
        {nextLevel ? (
          <CardContent className="py-6 px-6 md:px-8 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                Progress to <strong className="text-[#1E3A5F]">{nextLevel.name}</strong>
              </span>
              <span className="text-slate-500 font-mono">
                {verifiedHours.toFixed(1)} / {nextLevel.minHours} h ({hoursNeededForNext.toFixed(1)} h left)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2.5 bg-slate-100" indicatorClassName="bg-[#D4A017]" />
            <p className="text-[10px] text-muted-foreground">
              Progress updates automatically upon validation of logged commitment hours by partner coordinators.
            </p>
          </CardContent>
        ) : (
          <CardContent className="py-6 px-6 md:px-8 text-xs text-slate-500">
            👑 You have reached the highest badge level <strong>Legend</strong>! Thank you for your massive impact.
          </CardContent>
        )}
      </Card>

      {/* Roadmap timeline */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Achievement Roadmap</CardTitle>
          <CardDescription>
            Gain hours to unlock rewards and coordinator privileges on BIH.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[17px] sm:before:left-[21px] before:w-[2px] before:bg-slate-100">
          {levels.map((level, idx) => {
            const LevelIcon = level.icon;
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            let badgeColor = "bg-slate-200 text-slate-400"; // Future
            let iconColor = "text-slate-400";
            let borderStyle = "border-slate-200";

            if (isCompleted) {
              badgeColor = "bg-[#6B8E3E]/10 text-[#6B8E3E]"; // Completed (Olive green)
              iconColor = "text-[#6B8E3E]";
              borderStyle = "border-[#6B8E3E]";
            } else if (isCurrent) {
              badgeColor = "bg-[#D4A017]/10 text-[#D4A017] border-2 border-[#D4A017] animate-pulse"; // Current (Gold)
              iconColor = "text-[#D4A017]";
              borderStyle = "border-[#D4A017]";
            }

            return (
              <div key={level.name} className="flex gap-4 relative">
                {/* Node indicator */}
                <div
                  className={`absolute -left-[27px] sm:-left-[31px] top-1.5 h-6 w-6 rounded-full flex items-center justify-center bg-white border-2 shadow-sm ${borderStyle}`}
                >
                  <LevelIcon className={`h-3 w-3 ${iconColor}`} />
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{level.name}</span>
                    <Badge className={`text-[8px] font-sans font-bold uppercase tracking-wider py-0.5 px-2 ${badgeColor}`}>
                      {isCompleted ? "Completed" : isCurrent ? "Active Tier" : `Requires ${level.minHours} h`}
                    </Badge>
                  </div>
                  <p className="text-slate-500 leading-relaxed max-w-xl">{level.description}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default VolunteerBadgesPage;
