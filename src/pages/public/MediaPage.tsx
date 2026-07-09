import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface MediaArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  imageUrl: string;
  imageUrls: string[];
  fullStoryUrl: string;
  publishedAt: string;
  isPublished: boolean;
}

const MediaPage = () => {
  const [articles, setArticles] = useState<MediaArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<MediaArticle | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data, error } = await supabase
          .from("media_articles")
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false });

        if (error) throw error;

        setArticles(
          (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            summary: row.summary,
            content: row.content || row.summary,
            author: row.author,
            category: row.category,
            imageUrl: row.image_url || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=700&q=80",
            imageUrls: row.image_url ? [row.image_url] : [],
            fullStoryUrl: row.full_story_url || "",
            publishedAt: row.published_at,
            isPublished: row.is_published,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch media articles:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [selectedArticle?.id]);

  return (
    <section className="py-16">
      <div className="container space-y-8">
        <div>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest">Media & Articles</p>
          <h1 className="text-3xl md:text-5xl mt-3 mb-3 text-[#1E3A5F] font-serif font-bold">Stories, updates, and transparency</h1>
          <p className="text-muted-foreground max-w-2xl">
            Follow BIH announcements, impact stories, and operational insights.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-xl overflow-hidden bg-card border border-border p-4 space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm">No published articles at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Card key={article.id} className="overflow-hidden cursor-pointer transition-transform hover:-translate-y-1 flex flex-col justify-between" onClick={() => setSelectedArticle(article)}>
                <div>
                  <img src={article.imageUrls[0] ?? article.imageUrl} alt={article.title} className="h-48 w-full object-cover bg-slate-100" />
                  <CardHeader className="space-y-3">
                    <Badge variant="outline" className="w-fit border-[#1E3A5F] text-[#1E3A5F]">{article.category}</Badge>
                    <CardTitle className="text-xl text-[#1E3A5F] font-bold font-serif line-clamp-2">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p className="line-clamp-3">{article.summary}</p>
                    <p className="text-xs">
                      <span className="font-medium text-foreground">Author:</span> {article.author}
                    </p>
                    <p className="text-xs">
                      <span className="font-medium text-foreground">Published:</span> {new Date(article.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    </CardContent>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <Button variant="link" className="px-0 text-[#D4A017] hover:text-[#D4A017]/80">Read more</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={selectedArticle !== null} onOpenChange={(open) => !open && setSelectedArticle(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" overlayClassName="bg-black/40 backdrop-blur-sm">
            {selectedArticle ? (
              <div className="space-y-5">
                <img
                  src={selectedArticle.imageUrls[activeSlideIndex] ?? selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="h-56 w-full object-cover rounded-md border"
                />
                {selectedArticle.imageUrls.length > 1 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveSlideIndex((prev) => (prev === 0 ? selectedArticle.imageUrls.length - 1 : prev - 1))}
                      >
                        Previous
                      </Button>
                      <p className="text-xs text-muted-foreground">Image {activeSlideIndex + 1} of {selectedArticle.imageUrls.length}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveSlideIndex((prev) => (prev + 1) % selectedArticle.imageUrls.length)}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedArticle.imageUrls.map((imageUrl, index) => (
                        <button
                          key={`${selectedArticle.id}-slide-${index}`}
                          type="button"
                          onClick={() => setActiveSlideIndex(index)}
                          className={`overflow-hidden rounded border ${activeSlideIndex === index ? "ring-2 ring-primary" : ""}`}
                        >
                          <img src={imageUrl} alt={`${selectedArticle.title} slide ${index + 1}`} className="h-16 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <DialogHeader className="space-y-3">
                  <Badge variant="outline" className="w-fit border-[#1E3A5F] text-[#1E3A5F]">{selectedArticle.category}</Badge>
                  <DialogTitle className="text-2xl md:text-3xl text-[#1E3A5F] font-bold font-serif">{selectedArticle.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Author:</span> {selectedArticle.author} · {" "}
                    <span className="font-medium text-foreground">Published:</span> {new Date(selectedArticle.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </DialogHeader>

                <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
                  {selectedArticle.content.split("\n").filter((line) => line.trim()).map((paragraph, index) => (
                    <p key={`${selectedArticle.id}-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </div>

                {selectedArticle.fullStoryUrl ? (
                  <div className="pt-1">
                    <Button asChild className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
                      <a href={selectedArticle.fullStoryUrl} target="_blank" rel="noreferrer">
                        Read Full Story Source
                      </a>
                    </Button>
                  </div>
                ) : null}

                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">More on this topic</h3>
                  <div className="space-y-2">
                    {articles
                      .filter((article) => article.id !== selectedArticle.id && article.category === selectedArticle.category)
                      .slice(0, 3)
                      .map((article) => (
                        <button
                          key={`${selectedArticle.id}-related-${article.id}`}
                          type="button"
                          onClick={() => setSelectedArticle(article)}
                          className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <p className="text-sm font-medium text-foreground">{article.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(article.publishedAt).toLocaleDateString()}</p>
                        </button>
                      ))}

                    {articles.filter((article) => article.id !== selectedArticle.id && article.category === selectedArticle.category).length === 0 ? (
                      <p className="text-xs text-muted-foreground">More topic entries will appear here as new related articles are added.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default MediaPage;
