import { useEffect, useState } from "react";
import { getMediaArticles } from "@/lib/platform-data";
import type { MediaArticle } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MediaPage = () => {
  const [articles, setArticles] = useState<MediaArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </section>
  );
};

export default MediaPage;
