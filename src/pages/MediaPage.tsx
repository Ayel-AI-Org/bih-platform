import { useEffect, useState } from "react";
import { getMediaArticles } from "@/lib/platform-data";
import type { MediaArticle } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MediaPage = () => {
  const [articles, setArticles] = useState<MediaArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<MediaArticle | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const items = await getMediaArticles();
        setArticles(items);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, []);

  return (
    <section className="py-16">
      <div className="container space-y-8">
        <div>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest">Media & Articles</p>
          <h1 className="text-3xl md:text-5xl mt-3 mb-3">Stories, updates, and transparency</h1>
          <p className="text-muted-foreground max-w-2xl">
            Follow BIH announcements, impact stories, and operational insights.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading articles...</p>
        ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Card key={article.id} className="overflow-hidden">
              <img src={article.imageUrl} alt={article.title} className="h-48 w-full object-cover" />
              <CardHeader className="space-y-3">
                <Badge variant="outline">{article.category}</Badge>
                <CardTitle className="text-2xl">{article.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{article.summary}</p>
                <p>
                  <span className="font-medium text-foreground">Author:</span> {article.author}
                </p>
                <p>
                  <span className="font-medium text-foreground">Published:</span> {new Date(article.publishedAt).toLocaleDateString()}
                </p>
                <Button
                  variant="link"
                  className="px-0 text-primary"
                  onClick={() => setSelectedArticle(article)}
                >
                  Read more
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        <Dialog open={selectedArticle !== null} onOpenChange={(open) => !open && setSelectedArticle(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" overlayClassName="bg-black/40 backdrop-blur-sm">
            {selectedArticle ? (
              <div className="space-y-5">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="h-56 w-full object-cover rounded-md border"
                />
                <DialogHeader className="space-y-3">
                  <Badge variant="outline" className="w-fit">{selectedArticle.category}</Badge>
                  <DialogTitle className="text-2xl md:text-3xl">{selectedArticle.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Author:</span> {selectedArticle.author} · {" "}
                    <span className="font-medium text-foreground">Published:</span> {new Date(selectedArticle.publishedAt).toLocaleDateString()}
                  </p>
                </DialogHeader>

                <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
                  {selectedArticle.content.split("\n").filter((line) => line.trim()).map((paragraph, index) => (
                    <p key={`${selectedArticle.id}-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </div>

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
