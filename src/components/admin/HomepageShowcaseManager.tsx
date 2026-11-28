import React, { useState, useEffect } from "react";
import {
  Layers,
  Video as VideoIcon,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Upload,
  Link as LinkIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from "@/components/admin/FileUploader";
import { parseVideoUrl, VideoEmbed } from "@/components/common/VideoEmbed";
import {
  getHomepageShowcaseSettings,
  updateHomepageShowcaseSettings,
  DEFAULT_HOMEPAGE_SHOWCASE_SETTINGS,
} from "@/database/operations";
import { type HomepageShowcaseSettings, type HomepageShowcaseMode } from "@/database/types";

export interface HomepageShowcaseManagerProps {
  onSettingsSaved?: (newSettings: HomepageShowcaseSettings) => void;
}

export const HomepageShowcaseManager: React.FC<HomepageShowcaseManagerProps> = ({
  onSettingsSaved,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HomepageShowcaseSettings>(
    DEFAULT_HOMEPAGE_SHOWCASE_SETTINGS
  );
  const [initialSettings, setInitialSettings] = useState<HomepageShowcaseSettings>(
    DEFAULT_HOMEPAGE_SHOWCASE_SETTINGS
  );

  // Video source input tab: "url" vs "upload"
  const [videoSourceMode, setVideoSourceMode] = useState<"url" | "upload">("url");
  // Thumbnail source tab: "url" vs "upload"
  const [thumbSourceMode, setThumbSourceMode] = useState<"url" | "upload">("url");

  // Show live preview toggle
  const [showLivePreview, setShowLivePreview] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const data = await getHomepageShowcaseSettings();
        if (isMounted) {
          setSettings(data);
          setInitialSettings(data);
          // If the loaded video URL is an uploaded storage URL, auto-set tab to upload
          if (data.videoUrl && data.videoUrl.includes("/storage/v1/object/public/")) {
            setVideoSourceMode("upload");
          }
          if (data.thumbnailUrl && data.thumbnailUrl.includes("/storage/v1/object/public/")) {
            setThumbSourceMode("upload");
          }
        }
      } catch (err: any) {
        toast({
          title: "Failed to load showcase settings",
          description: err.message || "Using default configuration.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const parsedVideo = parseVideoUrl(settings.videoUrl || "");
  const isVideoValid =
    Boolean(settings.videoUrl) &&
    (parsedVideo.type === "youtube" ||
      parsedVideo.type === "vimeo" ||
      parsedVideo.type === "direct");

  const handleReset = () => {
    setSettings(initialSettings);
    toast({
      title: "Changes reverted",
      description: "Restored previous showcase configuration.",
    });
  };

  const handleSave = async () => {
    // Validation
    if (settings.mode === "video") {
      if (!settings.videoTitle.trim()) {
        toast({
          title: "Title required",
          description: "Please provide a headline for the promotional video section.",
          variant: "destructive",
        });
        return;
      }
      if (!settings.videoDescription.trim()) {
        toast({
          title: "Description required",
          description: "Please provide a brief description for the promotional video section.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      await updateHomepageShowcaseSettings(settings);
      setInitialSettings(settings);
      toast({
        title: "Showcase configuration saved",
        description: `Homepage showcase is now set to ${
          settings.mode === "video" ? "Promotional Video" : "Latest Updates"
        }.`,
      });
      if (onSettingsSaved) {
        onSettingsSaved(settings);
      }
    } catch (err: any) {
      toast({
        title: "Failed to save showcase settings",
        description:
          err.message || "An unexpected error occurred while saving to database.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F] mx-auto" />
        <p className="text-xs text-muted-foreground font-medium">
          Loading homepage showcase configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1E3A5F] rounded-xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017]">
              Current Homepage Mode
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-white">
            {settings.mode === "video" ? "Promotional Video Showcase" : "Latest Updates Feed"}
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            {settings.mode === "video"
              ? "The homepage highlights your promotional video in the primary showcase slot."
              : "The homepage highlights recent events, announcements, and media in an interactive carousel."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white hover:text-white text-xs h-9"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> View Live Homepage
            </a>
          </Button>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-bold text-slate-900">Showcase Display Mode</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose what content occupies the featured homepage showcase directly below the Hero section.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Option A: Latest Updates */}
          <div
            onClick={() => setSettings((prev) => ({ ...prev, mode: "updates" }))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSettings((prev) => ({ ...prev, mode: "updates" }));
              }
            }}
            className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left space-y-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] ${
              settings.mode === "updates"
                ? "border-[#1E3A5F] bg-blue-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  settings.mode === "updates"
                    ? "bg-[#1E3A5F] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              {settings.mode === "updates" && (
                <Badge className="bg-[#1E3A5F] text-white text-[10px]">Active</Badge>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Mode A: Latest Updates (Default)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Renders published announcements, community events, and press updates in an interactive horizontal carousel.
              </p>
            </div>
          </div>

          {/* Option B: Promotional Video */}
          <div
            onClick={() => setSettings((prev) => ({ ...prev, mode: "video" }))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSettings((prev) => ({ ...prev, mode: "video" }));
              }
            }}
            className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left space-y-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] ${
              settings.mode === "video"
                ? "border-[#D4A017] bg-amber-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  settings.mode === "video"
                    ? "bg-[#D4A017] text-slate-950 font-bold"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <VideoIcon className="w-5 h-5" />
              </div>
              {settings.mode === "video" && (
                <Badge className="bg-[#D4A017] text-slate-950 font-semibold text-[10px]">
                  Active
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Mode B: Promotional Video
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Spotlights your organizational video in a cinematic container with interactive modal playback and call-to-action.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form - Rendered when Promotional Video is chosen */}
      {settings.mode === "video" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-8 animate-in fade-in duration-200 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-serif font-bold text-[#1E3A5F]">
              Promotional Video Settings
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure video source, headline messaging, thumbnail cover, and optional destination button.
            </p>
          </div>

          {/* Video Source Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Video Source
              </Label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  type="button"
                  variant={videoSourceMode === "url" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setVideoSourceMode("url")}
                  className="h-7 text-xs px-2.5 font-medium gap-1"
                >
                  <LinkIcon className="w-3 h-3" /> Web URL
                </Button>
                <Button
                  type="button"
                  variant={videoSourceMode === "upload" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setVideoSourceMode("upload")}
                  className="h-7 text-xs px-2.5 font-medium gap-1"
                >
                  <Upload className="w-3 h-3" /> Upload File
                </Button>
              </div>
            </div>

            {videoSourceMode === "url" ? (
              <div className="space-y-2">
                <Input
                  value={settings.videoUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, videoUrl: e.target.value }))
                  }
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/... or direct .mp4 link"
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {parsedVideo.type !== "unknown" ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Recognized format:{" "}
                        <strong className="capitalize">{parsedVideo.type}</strong>
                      </span>
                    ) : settings.videoUrl ? (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        URL format not automatically parsed (will be tested in player)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Supports YouTube, Vimeo, or direct MP4/WebM video URLs.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUploader
                  bucket="bih-media"
                  folder="videos"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  multiple={false}
                  maxSizeMB={25}
                  value={settings.videoUrl ? [settings.videoUrl] : []}
                  onChange={(urls) => {
                    setSettings((prev) => ({
                      ...prev,
                      videoUrl: urls[0] || "",
                    }));
                  }}
                />
                <div className="flex items-start gap-1.5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Hosting Recommendation:</strong> Supabase direct file upload is limited to 25 MB.
                    For high-definition (1080p/4K) or long videos, we recommend hosting on YouTube or Vimeo
                    and pasting the URL above for optimal streaming performance on mobile devices.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Heading and Description */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Section Headline
              </Label>
              <Input
                value={settings.videoTitle}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, videoTitle: e.target.value }))
                }
                placeholder="Beyond awareness. Into impact."
                className="font-serif text-base"
              />
              <p className="text-[11px] text-muted-foreground">
                The primary headline displayed prominently beside the video.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Short Description / Mission Statement
              </Label>
              <Textarea
                rows={3}
                value={settings.videoDescription}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, videoDescription: e.target.value }))
                }
                placeholder="Discover who we are, what we stand for, and the change we're working to create."
                className="text-sm leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Brief paragraph providing context and mission framing.
              </p>
            </div>
          </div>

          {/* Thumbnail / Cover Image */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Thumbnail / Poster Cover (Optional)
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Custom cover image shown before the video starts. If left empty, YouTube auto-extracts HD thumbnail.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  type="button"
                  variant={thumbSourceMode === "url" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setThumbSourceMode("url")}
                  className="h-7 text-xs px-2.5 font-medium gap-1"
                >
                  <LinkIcon className="w-3 h-3" /> Image URL
                </Button>
                <Button
                  type="button"
                  variant={thumbSourceMode === "upload" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setThumbSourceMode("upload")}
                  className="h-7 text-xs px-2.5 font-medium gap-1"
                >
                  <Upload className="w-3 h-3" /> Upload Image
                </Button>
              </div>
            </div>

            {thumbSourceMode === "url" ? (
              <Input
                value={settings.thumbnailUrl}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, thumbnailUrl: e.target.value }))
                }
                placeholder="https://images.unsplash.com/... or public image link"
                className="font-mono text-xs"
              />
            ) : (
              <FileUploader
                bucket="bih-media"
                folder="thumbnails"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                multiple={false}
                maxSizeMB={5}
                value={settings.thumbnailUrl ? [settings.thumbnailUrl] : []}
                onChange={(urls) => {
                  setSettings((prev) => ({
                    ...prev,
                    thumbnailUrl: urls[0] || "",
                  }));
                }}
              />
            )}
          </div>

          {/* Call-to-Action Controls */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                5. Call-to-Action Button (Optional)
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Displays a destination button alongside the "Watch Video" trigger. Leave empty to hide.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Button Text</Label>
                <Input
                  value={settings.ctaText}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, ctaText: e.target.value }))
                  }
                  placeholder="e.g. Discover Our Mission"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Destination Link</Label>
                <Input
                  value={settings.ctaUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, ctaUrl: e.target.value }))
                  }
                  placeholder="e.g. /about or /donate"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Secondary Latest Updates Visibility Toggle */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">
                  Show Latest Updates Below Showcase
                </span>
                <Badge variant="outline" className="text-[10px] bg-white">
                  Optional
                </Badge>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                When enabled, the Latest Updates carousel will appear immediately beneath the video on the homepage.
                When disabled (default), only the promotional video is shown in the showcase area.
              </p>
            </div>

            <Switch
              checked={settings.showLatestUpdatesBelow}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  showLatestUpdatesBelow: checked,
                }))
              }
              aria-label="Toggle Latest Updates Below Showcase"
            />
          </div>
        </div>
      )}

      {/* Live Preview Toggle & Card */}
      {settings.mode === "video" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">
                Live Admin Preview
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLivePreview((prev) => !prev)}
              className="text-xs h-7"
            >
              {showLivePreview ? "Hide Preview" : "Show Preview"}
            </Button>
          </div>

          {showLivePreview && (
            <div className="rounded-xl overflow-hidden border border-slate-300 shadow-md">
              <div className="bg-slate-800 text-white/70 text-[11px] px-4 py-2 flex items-center justify-between border-b border-white/10">
                <span>Homepage Simulation (Dark Forest Brand Palette)</span>
                <span className="text-[#D4A017] font-medium">Unsaved Preview</span>
              </div>
              <div className="p-6 md:p-8 bg-gradient-to-br from-[#0c1e19] via-[#132c25] to-[#0a1814] text-white">
                <div className="grid md:grid-cols-2 gap-6 items-center max-w-4xl mx-auto">
                  <div className="space-y-3 text-left">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#D4A017] px-2.5 py-1 rounded-full bg-white/10 border border-white/20">
                      Our Story in Motion
                    </span>
                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-white leading-tight">
                      {settings.videoTitle || "Beyond awareness. Into impact."}
                    </h3>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {settings.videoDescription ||
                        "Discover who we are, what we stand for, and the change we're working to create."}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled
                        className="bg-[#D4A017] text-slate-950 text-xs font-semibold h-8"
                      >
                        Watch Video
                      </Button>
                      {settings.ctaText && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="border-white/30 text-white bg-white/5 text-xs h-8"
                        >
                          {settings.ctaText}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/20 relative bg-black/60 shadow-lg flex items-center justify-center">
                    {settings.thumbnailUrl ? (
                      <img
                        src={settings.thumbnailUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <VideoIcon className="w-8 h-8 text-[#D4A017] mx-auto mb-1 opacity-80" />
                        <span className="text-[11px] text-white/70">
                          {settings.videoUrl ? "Video Player Ready" : "No Video URL configured"}
                        </span>
                      </div>
                    )}
                    <div className="absolute w-12 h-12 rounded-full bg-[#D4A017] text-slate-950 flex items-center justify-center shadow-md">
                      <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-slate-950 ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {hasUnsavedChanges ? (
            <span className="text-amber-700 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              You have unsaved changes
            </span>
          ) : (
            <span className="text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              All changes saved to database
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {hasUnsavedChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saving}
              className="text-xs h-9"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Revert
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-semibold text-xs px-6 h-9 gap-1.5 shadow-sm ml-auto sm:ml-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Showcase Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomepageShowcaseManager;
