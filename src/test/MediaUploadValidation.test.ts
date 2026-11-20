import { describe, it, expect, vi } from "vitest";
import { parseVideoUrl } from "@/components/common/VideoEmbed";
import { uploadStorageFile } from "@/database/operations";
import { supabase } from "@/database/client";

describe("Video URL Parser (parseVideoUrl)", () => {
  it("correctly identifies and formats standard YouTube watch URLs", () => {
    const res = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(res.type).toBe("youtube");
    expect(res.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  });

  it("correctly parses short youtu.be links", () => {
    const res = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(res.type).toBe("youtube");
    expect(res.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  });

  it("correctly parses YouTube Shorts URLs", () => {
    const res = parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(res.type).toBe("youtube");
    expect(res.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  });

  it("correctly parses Vimeo video URLs", () => {
    const res = parseVideoUrl("https://vimeo.com/123456789");
    expect(res.type).toBe("vimeo");
    expect(res.embedUrl).toBe("https://player.vimeo.com/video/123456789");
  });

  it("correctly identifies direct MP4 and WebM video files", () => {
    const mp4 = parseVideoUrl("https://example.com/videos/community_impact.mp4");
    expect(mp4.type).toBe("direct");
    expect(mp4.embedUrl).toBe("https://example.com/videos/community_impact.mp4");

    const webm = parseVideoUrl("https://example.com/videos/teaser.webm?token=123");
    expect(webm.type).toBe("direct");
  });

  it("returns unknown for arbitrary links or empty values", () => {
    expect(parseVideoUrl("").type).toBe("unknown");
    expect(parseVideoUrl("https://example.com/article").type).toBe("unknown");
  });
});

describe("Storage Upload Handler (uploadStorageFile)", () => {
  it("rejects files exceeding the 25 MB limit immediately before network call", async () => {
    const largeFile = new File([new Uint8Array(26 * 1024 * 1024)], "oversized.pdf", {
      type: "application/pdf",
    });

    await expect(uploadStorageFile("bih-media", "updates/oversized.pdf", largeFile)).rejects.toThrow(
      "File size exceeds the 25 MB limit."
    );
  });

  it("translates Supabase storage bucket MIME restriction error into an actionable message", async () => {
    const pdfFile = new File([new Uint8Array(1024)], "report.pdf", {
      type: "application/pdf",
    });

    const mockUpload = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "mime type application/pdf is not supported",
        name: "StorageApiError",
        status: 400,
        statusCode: "415",
      },
    });

    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn(),
    } as any);

    await expect(uploadStorageFile("bih-media", "updates/report.pdf", pdfFile)).rejects.toThrow(
      /The storage bucket rejected "report.pdf" because the file format/
    );
  });

  it("translates Supabase RLS security policy rejection into clear permission message", async () => {
    const imageFile = new File([new Uint8Array(1024)], "cover.jpg", {
      type: "image/jpeg",
    });

    const mockUpload = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "new row violates row-level security policy for table objects",
      },
    });

    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn(),
    } as any);

    await expect(uploadStorageFile("bih-media", "updates/cover.jpg", imageFile)).rejects.toThrow(
      "Upload permission denied by storage security policies. Ensure you are signed in with admin permissions."
    );
  });

  it("successfully sets normalized contentType when file.type is empty", async () => {
    const fileWithEmptyType = new File([new Uint8Array(1024)], "press_release.pdf", {
      type: "", // Common Windows empty MIME edge case
    });

    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: "updates/press_release.pdf" },
      error: null,
    });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/storage/bih-media/updates/press_release.pdf" },
    });

    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as any);

    const publicUrl = await uploadStorageFile("bih-media", "updates/press_release.pdf", fileWithEmptyType);

    expect(mockUpload).toHaveBeenCalledWith(
      "updates/press_release.pdf",
      fileWithEmptyType,
      expect.objectContaining({
        contentType: "application/pdf",
      })
    );
    expect(publicUrl).toBe("https://example.com/storage/bih-media/updates/press_release.pdf");
  });
});
