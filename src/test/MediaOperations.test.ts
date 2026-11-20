import { describe, it, expect, vi } from "vitest";
import { getLatestUpdates } from "@/database/operations";
import { supabase } from "@/database/client";

describe("Database Operations - Media and Updates", () => {
  it("safely handles rows with null, empty, or undefined image_url without throwing", async () => {
    // Mock Supabase returning rows with various edge cases: null image_url, empty string, json array, plain string
    const mockData = [
      {
        id: "1",
        title: "Article with null image",
        summary: "Summary 1",
        content: "Content 1",
        author: "Admin",
        category: "News",
        published_at: "2026-11-20",
        image_url: null, // Critical edge case!
        type: "announcement",
        is_pinned: true,
        is_published: true,
      },
      {
        id: "2",
        title: "Article with empty string image",
        summary: "Summary 2",
        content: "Content 2",
        author: "Admin",
        category: "Event",
        published_at: "2026-11-19",
        image_url: "", // Critical edge case!
        type: "event",
        event_date: "2026-12-05",
        is_pinned: false,
        is_published: true,
      },
      {
        id: "3",
        title: "Article with standard single URL",
        summary: "Summary 3",
        content: "Content 3",
        author: "Admin",
        category: "Media",
        published_at: "2026-11-18",
        image_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
        type: "media",
        is_pinned: false,
        is_published: true,
      },
      {
        id: "4",
        title: "Article with JSON string array",
        summary: "Summary 4",
        content: "Content 4",
        author: "Admin",
        category: "News",
        published_at: "2026-11-17",
        image_url: JSON.stringify(["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]),
        type: "announcement",
        is_pinned: false,
        is_published: true,
      },
    ];

    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    const results = await getLatestUpdates(4);

    expect(results).toHaveLength(4);
    // Null image row should receive fallback image
    expect(results[0].imageUrl).toContain("images.unsplash.com");
    expect(results[0].title).toBe("Article with null image");

    // Empty string image row should receive fallback image
    expect(results[1].imageUrl).toContain("images.unsplash.com");

    // Single url
    expect(results[2].imageUrl).toBe("https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80");

    // JSON array
    expect(results[3].imageUrl).toBe("https://example.com/photo1.jpg");
    expect(results[3].imageUrls).toEqual(["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]);
  });
});
