import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from "@/components/admin/FileUploader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Loader2,
  Send,
  Eye,
  Pin,
  Star,
  Calendar,
  MapPin,
  ExternalLink,
  Download,
  Info,
  CheckCircle2,
  FileText,
  Sparkles,
  Video,
} from "lucide-react";
import { type UpdateType } from "@/database/types";
import { VideoEmbed } from "@/components/common/VideoEmbed";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80";

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case "announcement":
      return "bg-[#1E3A5F] text-white";
    case "event":
      return "bg-[#D4A017] text-white";
    case "media":
    default:
      return "bg-slate-700 text-white";
  }
};

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["announcement", "event", "media"]),
  summary: z.string().min(1, "Summary is required").max(300, "Summary cannot exceed 300 characters"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author name is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().optional().or(z.literal("")),
  fullStoryUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  publishedAt: z.string().optional().or(z.literal("")),
  isPublished: z.boolean(),
  isPinned: z.boolean(),
  // Event-specific fields
  eventDate: z.string().optional().or(z.literal("")),
  eventLocation: z.string().optional().or(z.literal("")),
  eventLink: z.string().optional().or(z.literal("")),
  // Media / Evidence assets
  galleryUrls: z.array(z.string()).default([]),
  attachmentUrl: z.string().optional().or(z.literal("")),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const AdminMediaFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      type: "media",
      summary: "",
      content: "",
      author: "",
      category: "News",
      imageUrl: "",
      fullStoryUrl: "",
      publishedAt: new Date().toISOString().split("T")[0],
      isPublished: false,
      isPinned: false,
      eventDate: "",
      eventLocation: "",
      eventLink: "",
      galleryUrls: [],
      attachmentUrl: "",
      videoUrl: "",
    },
  });

  const watchTitle = watch("title");
  const watchType = watch("type");
  const watchSummary = watch("summary");
  const watchContent = watch("content");
  const watchAuthor = watch("author");
  const watchCategory = watch("category");
  const watchImageUrl = watch("imageUrl");
  const watchPublishedAt = watch("publishedAt");
  const watchIsPublished = watch("isPublished");
  const watchIsPinned = watch("isPinned");
  const watchEventDate = watch("eventDate");
  const watchEventLocation = watch("eventLocation");
  const watchEventLink = watch("eventLink");
  const watchGalleryUrls = watch("galleryUrls");
  const watchAttachmentUrl = watch("attachmentUrl");
  const watchVideoUrl = watch("videoUrl");

  useEffect(() => {
    setSummaryText(watchSummary || "");
  }, [watchSummary]);

  useEffect(() => {
    const loadArticleAndAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch current admin full name to prefill author
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.full_name && !isEditMode) {
          setValue("author", profile.full_name);
        }

        // 2. Load article if in edit mode
        if (isEditMode) {
          const { data: article, error: artErr } = await supabase
            .from("media_articles")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (artErr) throw artErr;

          if (article) {
            setValue("title", article.title);
            setValue("type", (article.type as UpdateType) || "media");
            setValue("summary", article.summary || "");
            setValue("content", article.content || "");
            setValue("author", article.author || profile?.full_name || "");
            setValue("category", article.category || "News");
            setValue("imageUrl", article.image_url || "");
            setValue("fullStoryUrl", article.full_story_url || "");
            setValue("publishedAt", article.published_at || new Date().toISOString().split("T")[0]);
            setValue("isPublished", article.is_published || false);
            setValue("isPinned", article.is_pinned || false);

            setValue(
              "eventDate",
              article.event_date ? new Date(article.event_date).toISOString().slice(0, 16) : ""
            );
            setValue("eventLocation", article.event_location || "");
            setValue("eventLink", article.event_link || "");
            setValue("galleryUrls", Array.isArray(article.gallery_urls) ? article.gallery_urls : []);
            setValue("attachmentUrl", article.attachment_url || "");
            setValue("videoUrl", article.video_url || "");

            setSummaryText(article.summary || "");
          }
        }
      } catch (err: any) {
        toast({
          title: "Failed to load update details",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadArticleAndAdmin();
  }, [id, isEditMode, setValue]);

  const submitWithPublishState = (publishNow: boolean) => {
    setValue("isPublished", publishNow, { shouldValidate: true });
    handleSubmit((values) => handleSave(values, publishNow))();
  };

  const handleSave = async (values: ArticleFormValues, publishStateOverride?: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      const isPublishedValue = publishStateOverride !== undefined ? publishStateOverride : values.isPublished;

      const payload: Record<string, any> = {
        title: values.title,
        type: values.type,
        summary: values.summary,
        content: values.content,
        author: values.author,
        category: values.category,
        image_url: values.imageUrl || null,
        full_story_url: values.fullStoryUrl || null,
        published_at: isPublishedValue
          ? values.publishedAt || new Date().toISOString().split("T")[0]
          : null,
        is_published: isPublishedValue,
        is_pinned: values.isPinned,
        created_by: user.id,
        gallery_urls: values.galleryUrls || [],
        attachment_url: values.attachmentUrl || null,
        video_url: values.videoUrl?.trim() || null,
      };

      if (values.type === "event") {
        payload.event_date = values.eventDate ? new Date(values.eventDate).toISOString() : null;
        payload.event_location = values.eventLocation || null;
        payload.event_link = values.eventLink || null;
      } else {
        payload.event_date = null;
        payload.event_location = null;
        payload.event_link = null;
      }

      if (isEditMode) {
        let { data, error } = await supabase
          .from("media_articles")
          .update(payload)
          .eq("id", id)
          .select();

        // If video_url column hasn't been migrated yet in Supabase, retry without it
        if (error && error.message.includes("video_url") && error.message.includes("does not exist")) {
          delete payload.video_url;
          const retryRes = await supabase
            .from("media_articles")
            .update(payload)
            .eq("id", id)
            .select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Permission denied: check your admin role");
        }

        toast({
          title: "Update saved",
          description: `"${values.title}" has been updated successfully.`,
        });
      } else {
        let { data, error } = await supabase
          .from("media_articles")
          .insert(payload)
          .select();

        // If video_url column hasn't been migrated yet in Supabase, retry without it
        if (error && error.message.includes("video_url") && error.message.includes("does not exist")) {
          delete payload.video_url;
          const retryRes = await supabase
            .from("media_articles")
            .insert(payload)
            .select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Permission denied: check your admin role");
        }

        toast({
          title: isPublishedValue ? "Update published" : "Draft saved",
          description: `"${values.title}" has been registered successfully.`,
        });
      }

      navigate("/admin/media");
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-[450px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Title and Mobile Preview Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-800">
            <Link to="/admin/media">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">
              {isEditMode ? "Edit Update" : "Create New Update"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compose announcements, community events, or media articles with real-time public preview.
            </p>
          </div>
        </div>

        {/* Mobile / Tablet Live Preview Toggle Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="text-xs border-slate-300 text-[#1E3A5F] gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            {showMobilePreview ? "Hide Preview Panel" : "Show Live Preview"}
          </Button>
        </div>
      </div>

      {/* Two-Column Responsive Workspace: Main Form (65-70%) + Preview/Context (30-35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Primary Form Workspace */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
                {isEditMode ? "Update Details" : "New Update Composer"}
              </CardTitle>
              <CardDescription>
                Specify type, event logistics (if applicable), rich evidence, and visibility state.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5">
                {/* Title & Controlled Type Selector */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="title">Update Title</Label>
                    <Input
                      id="title"
                      disabled={saving}
                      className={errors.title ? "border-destructive" : ""}
                      placeholder="e.g. Annual Community Impact Summit 2026"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Controlled Type Selector */}
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Update Type</Label>
                    <Select
                      disabled={saving}
                      value={watchType}
                      onValueChange={(val: UpdateType) => setValue("type", val, { shouldValidate: true })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="event">Scheduled Event</SelectItem>
                        <SelectItem value="media">Media / Story</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Author & Category */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="author">Author / Organizer</Label>
                    <Input
                      id="author"
                      disabled={saving}
                      className={errors.author ? "border-destructive" : ""}
                      {...register("author")}
                    />
                    {errors.author && (
                      <p className="text-xs text-destructive font-medium">{errors.author.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category / Sector</Label>
                    <Input
                      id="category"
                      placeholder="e.g. Innovation, Health, Environment, Governance"
                      disabled={saving}
                      className={errors.category ? "border-destructive" : ""}
                      {...register("category")}
                    />
                    {errors.category && (
                      <p className="text-xs text-destructive font-medium">{errors.category.message}</p>
                    )}
                  </div>
                </div>

                {/* Event Fields (Rendered only when type === 'event') */}
                {watchType === "event" && (
                  <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200/80 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Event Logistics & Schedule
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="eventDate" className="text-xs text-amber-900 font-semibold">
                          Event Date & Time
                        </Label>
                        <Input
                          id="eventDate"
                          type="datetime-local"
                          disabled={saving}
                          {...register("eventDate")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="eventLocation" className="text-xs text-amber-900 font-semibold">
                          Location / Venue
                        </Label>
                        <Input
                          id="eventLocation"
                          placeholder="e.g. Accra City Hall or Zoom"
                          disabled={saving}
                          {...register("eventLocation")}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="eventLink" className="text-xs text-amber-900 font-semibold">
                        Registration / Meeting Link (optional)
                      </Label>
                      <Input
                        id="eventLink"
                        placeholder="https://eventbrite.com/... or https://meet.google.com/..."
                        disabled={saving}
                        {...register("eventLink")}
                      />
                    </div>
                  </div>
                )}

                {/* Summary with Counter (max 300) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="summary">Summary Excerpt</Label>
                    <span className={`text-[10px] font-sans ${summaryText.length > 300 ? "text-destructive font-bold" : "text-slate-500"}`}>
                      {summaryText.length} / 300 chars
                    </span>
                  </div>
                  <Textarea
                    id="summary"
                    rows={2}
                    disabled={saving}
                    className={errors.summary ? "border-destructive" : ""}
                    placeholder="A concise summary for feeds, carousels, and preview cards (max 300 chars)..."
                    {...register("summary")}
                  />
                  {errors.summary && (
                    <p className="text-xs text-destructive font-medium">{errors.summary.message}</p>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <Label htmlFor="content">Full Article / Announcement Description</Label>
                  <Textarea
                    id="content"
                    rows={8}
                    disabled={saving}
                    className={errors.content ? "border-destructive font-sans text-xs" : "font-sans text-xs"}
                    placeholder="Write full story details, agenda, or background here..."
                    {...register("content")}
                  />
                  {errors.content && (
                    <p className="text-xs text-destructive font-medium">{errors.content.message}</p>
                  )}
                </div>

                {/* Cover Image Uploader (single) */}
                <div className="space-y-1.5">
                  <Label>Cover Image</Label>
                  <FileUploader
                    bucket="bih-media"
                    folder="updates"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple={false}
                    maxSizeMB={25}
                    value={watchImageUrl ? [watchImageUrl] : []}
                    onChange={(urls) => setValue("imageUrl", urls[0] || "", { shouldDirty: true })}
                    disabled={saving}
                  />
                </div>

                {/* Gallery Uploader (multiple) */}
                <div className="space-y-1.5">
                  <Label>Photo Gallery (Multiple Images)</Label>
                  <FileUploader
                    bucket="bih-media"
                    folder="updates/gallery"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple={true}
                    maxSizeMB={25}
                    value={watchGalleryUrls || []}
                    onChange={(urls) => setValue("galleryUrls", urls, { shouldDirty: true })}
                    disabled={saving}
                  />
                </div>

                {/* Attachment Uploader (PDF single) */}
                <div className="space-y-1.5">
                  <Label>Attachment Document (PDF, e.g. Report, Program, Press Release)</Label>
                  <FileUploader
                    bucket="bih-media"
                    folder="updates/attachments"
                    accept="application/pdf,.pdf"
                    multiple={false}
                    maxSizeMB={25}
                    value={watchAttachmentUrl ? [watchAttachmentUrl] : []}
                    onChange={(urls) => setValue("attachmentUrl", urls[0] || "", { shouldDirty: true })}
                    disabled={saving}
                  />
                </div>

                {/* Featured Video (YouTube / Vimeo / Direct Video URL) */}
                <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="videoUrl" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-[#1E3A5F]" />
                      Featured Video (YouTube, Vimeo, or Video Link)
                    </Label>
                    <span className="text-[10px] text-slate-500 font-sans">External streaming</span>
                  </div>
                  <Input
                    id="videoUrl"
                    disabled={saving}
                    className={errors.videoUrl ? "border-destructive text-xs" : "text-xs"}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    {...register("videoUrl")}
                  />
                  {errors.videoUrl && (
                    <p className="text-xs text-destructive font-medium">{errors.videoUrl.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Recommended for videos to ensure smooth mobile streaming with zero hosting bandwidth cost.
                  </p>
                  {watchVideoUrl && (
                    <div className="pt-2">
                      <VideoEmbed url={watchVideoUrl} title={watchTitle || "Update video"} />
                    </div>
                  )}
                </div>

                {/* External URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullStoryUrl">External Reference URL (optional)</Label>
                  <Input
                    id="fullStoryUrl"
                    disabled={saving}
                    className={errors.fullStoryUrl ? "border-destructive" : ""}
                    placeholder="https://external-news-source.com/..."
                    {...register("fullStoryUrl")}
                  />
                  {errors.fullStoryUrl && (
                    <p className="text-xs text-destructive font-medium">{errors.fullStoryUrl.message}</p>
                  )}
                </div>

                {/* Pin to Top Switch */}
                <div className="flex items-center justify-between rounded-lg border p-3.5 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPinned" className="text-sm font-semibold text-slate-800">
                      Pin to Top of Updates & Home Spotlight
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pinned items appear first on feeds and claim the homepage announcement pill.
                    </p>
                  </div>
                  <Switch
                    id="isPinned"
                    disabled={saving}
                    checked={watchIsPinned}
                    onCheckedChange={(checked) => setValue("isPinned", checked)}
                  />
                </div>

                {/* Actions: Save Draft and Publish */}
                <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                  <Button asChild variant="ghost" className="text-xs h-10 px-4">
                    <Link to="/admin/media">Cancel</Link>
                  </Button>

                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => submitWithPublishState(false)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-10 px-4 gap-1.5"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Draft
                    </Button>

                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => submitWithPublishState(true)}
                      className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium flex gap-1.5 h-10 px-5 text-xs shadow-xs"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Publish
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Public Preview & Contextual Metadata Panel (30-35%) */}
        <div className={`lg:col-span-5 xl:col-span-4 space-y-5 ${showMobilePreview ? "block" : "hidden lg:block"} lg:sticky lg:top-6`}>
          {/* Live Preview Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                  Live Public Card Preview
                </h3>
              </div>
             
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  <img
                    src={watchImageUrl || FALLBACK_IMAGE}
                    alt={watchTitle || "Update preview"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = FALLBACK_IMAGE;
                    }}
                  />
                  {!watchImageUrl && (
                    <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px] flex items-center justify-center p-3 text-center">
                      <span className="text-[11px] font-medium text-white/95 bg-black/40 px-2.5 py-1 rounded-full border border-white/20">
                        Default Cover Placeholder
                      </span>
                    </div>
                  )}

                  {/* Event Date Badge */}
                  {watchType === "event" && watchEventDate && (
                    <div className="absolute top-2.5 left-2.5 bg-[#1E3A5F] text-white rounded-lg px-2.5 py-1 shadow-md flex flex-col items-center leading-none text-center border border-white/20">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#D4A017]">
                        {new Date(watchEventDate).toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-sm font-bold font-serif mt-0.5">
                        {new Date(watchEventDate).toLocaleDateString(undefined, { day: "numeric" })}
                      </span>
                    </div>
                  )}

                  {/* Pinned Indicator Badge */}
                  {watchIsPinned && (
                    <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white rounded-full p-1.5 shadow-md" title="Pinned Editorial Priority">
                      <Pin className="h-3.5 w-3.5 fill-white" />
                    </div>
                  )}
                </div>

                <CardHeader className="space-y-2 pt-3.5 pb-2 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(watchType)}`}>
                      {watchType}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 font-sans">
                      {watchCategory || "Category"}
                    </Badge>
                    {watchIsPinned && (
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-900 border-amber-300 font-medium flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-serif text-[#1E3A5F] font-bold line-clamp-2 leading-snug">
                    {watchTitle?.trim() || "Untitled Update (Draft)"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2.5 text-xs text-muted-foreground pb-3 px-4">
                  <p className="line-clamp-3 leading-relaxed text-slate-600">
                    {watchSummary?.trim() || "A concise summary will appear here once entered in the form on the left..."}
                  </p>

                  {watchType === "event" && watchEventLocation && (
                    <p className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5 bg-amber-50/70 p-1.5 rounded border border-amber-200/60">
                      <MapPin className="h-3 w-3 text-[#D4A017] shrink-0" />
                      <span className="truncate">{watchEventLocation}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span className="truncate max-w-[130px]">By {watchAuthor || "BIH Team"}</span>
                    <span>
                      {watchEventDate && watchType === "event"
                        ? new Date(watchEventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                        : watchPublishedAt || "Today"}
                    </span>
                  </div>
                </CardContent>
              </div>

              <div className="px-4 pb-3 pt-0 flex items-center justify-between border-t border-slate-50 pt-2">
                <span className="text-[11px] font-semibold text-[#1E3A5F] flex items-center gap-1">
                  {watchType === "event" ? "Event details" : "Read full update"} &rarr;
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFullPreviewOpen(true)}
                  className="h-6 px-2 text-[10px] font-medium text-[#1E3A5F] border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" /> Full Story View
                </Button>
              </div>
            </Card>
          </div>

          {/* Contextual Status & Guidance Card */}
          <Card className="border-slate-200 bg-slate-50/60 shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-slate-200/80">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#D4A017]" /> Update Context & Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Publishing Status</span>
                <Badge className={watchIsPublished ? "bg-[#6B8E3E] text-white text-[10px]" : "bg-amber-100 text-amber-800 border-amber-300 text-[10px]"}>
                  {watchIsPublished ? "Live (Public)" : "Draft (Hidden)"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Feed Priority</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  {watchIsPinned ? (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Pin className="h-3 w-3 fill-amber-500 text-amber-500" /> Pinned Spotlight
                    </span>
                  ) : (
                    <span className="text-slate-600">Standard Timeline</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Format</span>
                <span className="capitalize font-medium text-slate-700">
                  {watchType === "event" ? "Scheduled Event (.ics enabled)" : watchType === "announcement" ? "Announcement" : "Media Story"}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/70 space-y-1.5 text-[11px]">
                <p className="font-semibold text-slate-700">Display Destinations:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>Public newsroom feed (`/media`)</li>
                  <li>Homepage Latest Updates feed</li>
                  {watchIsPinned && <li className="text-amber-800 font-medium">Homepage Hero announcement pill</li>}
                  {watchType === "event" && <li>Upcoming events calendar filter</li>}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Supporting Media</span>
                <span className="text-slate-700 font-medium">
                  {watchGalleryUrls?.length || 0} photo{(watchGalleryUrls?.length || 0) === 1 ? "" : "s"} • {watchAttachmentUrl ? "1 PDF" : "0 PDFs"}{watchVideoUrl ? " • 1 Video" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expanded Full Article Preview Modal */}
      <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={`text-[9px] uppercase font-bold tracking-wider border-none ${getTypeBadgeClass(watchType)}`}>
                {watchType}
              </Badge>
              <Badge variant="outline" className="text-slate-600 text-xs">
                {watchCategory || "Category"}
              </Badge>
              {watchIsPinned && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  Pinned
                </Badge>
              )}
              <Badge className={watchIsPublished ? "bg-[#6B8E3E] text-white" : "bg-slate-400 text-white"}>
                {watchIsPublished ? "Live" : "Draft"}
              </Badge>
            </div>
            <DialogTitle className="font-serif text-[#1E3A5F] text-2xl font-bold">
              {watchTitle || "Untitled Update"}
            </DialogTitle>
            <DialogDescription>
              By {watchAuthor || "Admin"} • {watchPublishedAt || "Today"}
            </DialogDescription>
          </DialogHeader>

          {/* Cover Image */}
          {(watchImageUrl || FALLBACK_IMAGE) && (
            <img
              src={watchImageUrl || FALLBACK_IMAGE}
              alt={watchTitle || "Cover"}
              className="w-full h-56 object-cover rounded-lg border bg-slate-100"
            />
          )}

          {/* Event Specific Card */}
          {watchType === "event" && (
            <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-900">
              {watchEventDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#D4A017]" />
                  <span className="font-semibold">Event Date:</span>
                  <span>
                    {new Date(watchEventDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {watchEventLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#D4A017]" />
                  <span className="font-semibold">Location:</span>
                  <span>{watchEventLocation}</span>
                </div>
              )}
              {watchEventLink && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-[#D4A017]" />
                  <a
                    href={watchEventLink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium hover:text-amber-950"
                  >
                    Event Registration Link
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {watchSummary && (
            <div className="p-3 bg-slate-50 border rounded-md text-xs text-slate-700 italic">
              "{watchSummary}"
            </div>
          )}

          {/* Content */}
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
            {watchContent || "No detailed description written yet."}
          </div>

          {/* Video Player */}
          {watchVideoUrl && (
            <div className="pt-2">
              <VideoEmbed url={watchVideoUrl} title={watchTitle || "Update video"} />
            </div>
          )}

          {/* Attachment */}
          {watchAttachmentUrl && (
            <div className="pt-2">
              <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                <a href={watchAttachmentUrl} target="_blank" rel="noreferrer" download>
                  <Download className="h-3.5 w-3.5" /> Download Attached Document (PDF)
                </a>
              </Button>
            </div>
          )}

          {/* Gallery */}
          {watchGalleryUrls && watchGalleryUrls.length > 0 && (
            <div className="space-y-2 pt-3 border-t">
              <h4 className="text-xs font-bold uppercase text-slate-700">Gallery Photos ({watchGalleryUrls.length})</h4>
              <div className="grid grid-cols-3 gap-2">
                {watchGalleryUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Gallery ${i}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFullPreviewOpen(false)} className="text-xs">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMediaFormPage;
