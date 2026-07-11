import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { uploadStorageFile } from "@/database/operations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, Upload } from "lucide-react";

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required").max(200, "Summary cannot exceed 200 characters"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author name is required"),
  category: z.enum(["News", "Impact Story", "Partner Update", "Announcement", "Report"]),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  fullStoryUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  publishedAt: z.string().optional().or(z.literal("")),
  isPublished: z.boolean(),
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
      summary: "",
      content: "",
      author: "",
      category: "News",
      imageUrl: "",
      fullStoryUrl: "",
      publishedAt: new Date().toISOString().split("T")[0],
      isPublished: false,
    },
  });

  const watchSummary = watch("summary");
  const watchIsPublished = watch("isPublished");

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
            setValue("summary", article.summary || "");
            setValue("content", article.content || "");
            setValue("author", article.author || profile?.full_name || "");
            setValue("category", article.category as any);
            setValue("imageUrl", article.image_url || "");
            setValue("fullStoryUrl", article.full_story_url || "");
            setValue("publishedAt", article.published_at || new Date().toISOString().split("T")[0]);
            setValue("isPublished", article.is_published || false);
            setSummaryText(article.summary || "");
          }
        }
      } catch (err: any) {
        toast({
          title: "Failed to load form context",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadArticleAndAdmin();
  }, [id, isEditMode, setValue]);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleMediaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file for the article cover.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const path = `articles/${Date.now()}_${file.name}`;
      const publicUrl = await uploadStorageFile("bih-media", path, file);

      setValue("imageUrl", publicUrl);
      toast({
        title: "Cover uploaded",
        description: "Article cover image uploaded successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload cover image.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (values: ArticleFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      const payload = {
        title: values.title,
        summary: values.summary,
        content: values.content,
        author: values.author,
        category: values.category,
        image_url: values.imageUrl || null,
        full_story_url: values.full_story_url || null,
        published_at: values.isPublished
          ? values.publishedAt || new Date().toISOString().split("T")[0]
          : null,
        is_published: values.isPublished,
        created_by: user.id,
      };

      if (isEditMode) {
        // Update existing article
        const { error } = await supabase
          .from("media_articles")
          .update(payload)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Article updated",
          description: "Changes saved to the article successfully.",
        });
      } else {
        // Insert new article
        const { error } = await supabase
          .from("media_articles")
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Article created",
          description: "New article registered successfully in the catalog.",
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
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-[450px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-800">
          <Link to="/admin/media">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">
            {isEditMode ? "Edit Article" : "Create New Article"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compose announcements or impact narratives showing community outcomes.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
            {isEditMode ? "Update Article Details" : "New Article Composer"}
          </CardTitle>
          <CardDescription>
            Provide details including categories, cover images, and publish visibility toggles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Article Title</Label>
              <Input
                id="title"
                disabled={saving}
                className={errors.title ? "border-destructive" : ""}
                placeholder="e.g. Clean Water Wells Completed in Central Region"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="author">Author Name</Label>
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
                <Label htmlFor="category">Category</Label>
                <Select
                  disabled={saving}
                  defaultValue={watch("category")}
                  onValueChange={(val: any) => setValue("category", val)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="News">News Announcement</SelectItem>
                    <SelectItem value="Impact Story">Impact Story</SelectItem>
                    <SelectItem value="Partner Update">Partner Update</SelectItem>
                    <SelectItem value="Announcement">Ecosystem Announcement</SelectItem>
                    <SelectItem value="Report">Ecosystem Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="summary">Brief Summary Excerpt</Label>
                <span className={`text-[10px] font-sans ${summaryText.length > 200 ? "text-destructive font-semibold" : "text-slate-450"}`}>
                  {summaryText.length} / 200 chars
                </span>
              </div>
              <Textarea
                id="summary"
                rows={2}
                disabled={saving}
                className={errors.summary ? "border-destructive" : ""}
                placeholder="A short description preview (max 200 chars)..."
                {...register("summary")}
              />
              {errors.summary && (
                <p className="text-xs text-destructive font-medium">{errors.summary.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Full Article Content</Label>
              <Textarea
                id="content"
                rows={10}
                disabled={saving}
                className={errors.content ? "border-destructive font-sans text-xs" : "font-sans text-xs"}
                placeholder="Write full news context details here..."
                {...register("content")}
              />
              {errors.content && (
                <p className="text-xs text-destructive font-medium">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="imageUrl">Cover Image URL (optional)</Label>
                <div className="relative">
                  <input
                    type="file"
                    id="article-image-file"
                    accept="image/*"
                    onChange={handleMediaImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={saving || uploadingImage}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[#1E3A5F] hover:bg-slate-50 text-[10px] h-7 px-2 flex gap-1 items-center"
                    disabled={saving || uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload file
                  </Button>
                </div>
              </div>
              <Input
                id="imageUrl"
                disabled={saving || uploadingImage}
                className={errors.imageUrl ? "border-destructive" : ""}
                placeholder="https://images.unsplash.com/..."
                {...register("imageUrl")}
              />
              {errors.imageUrl && (
                <p className="text-xs text-destructive font-medium">{errors.imageUrl.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullStoryUrl">Full External Story URL (optional)</Label>
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

            <div className="grid md:grid-cols-2 gap-5 pt-3 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="publishedAt">Publish Date</Label>
                <Input
                  id="publishedAt"
                  type="date"
                  disabled={saving || !watchIsPublished}
                  {...register("publishedAt")}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublished" className="text-sm font-semibold">Publish Directly</Label>
                  <p className="text-[10px] text-muted-foreground">Make story live on public media feeds instantly.</p>
                </div>
                <Switch
                  id="isPublished"
                  disabled={saving}
                  checked={watchIsPublished}
                  onCheckedChange={(checked) => setValue("isPublished", checked)}
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
              <Button asChild variant="ghost" className="text-xs h-10 px-4">
                <Link to="/admin/media">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium flex gap-1.5 h-10 px-6"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Article
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMediaFormPage;
