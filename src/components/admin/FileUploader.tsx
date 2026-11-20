import React, { useRef, useState, useCallback, useMemo } from "react";
import { UploadCloud, FileText, X, Loader2, ExternalLink, Image as ImageIcon, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadStorageFile } from "@/database/operations";

export interface FileUploaderProps {
  bucket: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

interface UploadingItem {
  id: string;
  name: string;
  size: number;
  isPdf: boolean;
}

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,application/pdf,.pdf";

export const FileUploader: React.FC<FileUploaderProps> = ({
  bucket,
  folder,
  accept = DEFAULT_ACCEPT,
  multiple = false,
  maxSizeMB = 25,
  value = [],
  onChange,
  disabled = false,
  className = "",
  label,
}) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingItem[]>([]);

  // Split accept string into normalized tokens
  const acceptTokens = useMemo(() => {
    return accept
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }, [accept]);

  // Determine user-friendly description of allowed files based on accept prop
  const formatDescription = useMemo(() => {
    const lower = accept.toLowerCase();
    const hasPdf = lower.includes("pdf");
    const hasImage = lower.includes("image") || lower.includes("jpg") || lower.includes("png") || lower.includes("webp");
    const hasVideo = lower.includes("video") || lower.includes("mp4") || lower.includes("webm");

    if (hasImage && hasPdf && hasVideo) {
      return `Images, PDFs, or Videos up to ${maxSizeMB} MB`;
    }
    if (hasImage && hasPdf) {
      return `Images (JPEG, PNG, WebP) or PDF documents up to ${maxSizeMB} MB`;
    }
    if (hasPdf && !hasImage && !hasVideo) {
      return `PDF documents (.pdf) up to ${maxSizeMB} MB`;
    }
    if (hasImage && !hasPdf && !hasVideo) {
      return `Images (JPEG, PNG, WebP) up to ${maxSizeMB} MB`;
    }
    if (hasVideo && !hasImage && !hasPdf) {
      return `Video files (MP4, WebM) up to ${maxSizeMB} MB`;
    }
    return `Supported files up to ${maxSizeMB} MB`;
  }, [accept, maxSizeMB]);

  const isPdfUrl = (url: string) => {
    const cleanUrl = url.toLowerCase().split("?")[0].split("#")[0];
    return cleanUrl.endsWith(".pdf");
  };

  const isVideoUrl = (url: string) => {
    const cleanUrl = url.toLowerCase().split("?")[0].split("#")[0];
    return (
      cleanUrl.endsWith(".mp4") ||
      cleanUrl.endsWith(".webm") ||
      cleanUrl.endsWith(".mov") ||
      cleanUrl.endsWith(".ogg")
    );
  };

  const getCleanFileName = (url: string) => {
    try {
      const segment = url.split("/").pop()?.split("?")[0] || "file";
      const decoded = decodeURIComponent(segment);
      // Remove leading timestamp prefix like 1732000000_
      return decoded.replace(/^\d+_/, "");
    } catch {
      return "Document";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File "${file.name}" exceeds the maximum upload limit of ${maxSizeMB} MB (${formatFileSize(file.size)}).`;
    }

    const fileType = (file.type || "").toLowerCase().trim();
    const fileName = file.name.toLowerCase();
    const ext = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";

    const isAllowed = acceptTokens.some((token) => {
      // 1. Direct extension match: e.g. ".pdf", ".png"
      if (token.startsWith(".")) {
        return ext === token;
      }
      // 2. Wildcard MIME match: e.g. "image/*", "video/*"
      if (token.endsWith("/*")) {
        const prefix = token.slice(0, -2);
        if (fileType && fileType.startsWith(prefix)) return true;
        if (token === "image/*" && [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) return true;
        if (token === "video/*" && [".mp4", ".webm", ".mov", ".ogg"].includes(ext)) return true;
        return false;
      }
      // 3. Exact MIME match: e.g. "application/pdf", "image/png"
      if (fileType && fileType === token) {
        return true;
      }
      // 4. Inferred matching when fileType is missing or inconsistent (common on Windows)
      if (token === "application/pdf" && ext === ".pdf") {
        return true;
      }
      if (token === "image/jpeg" && (ext === ".jpg" || ext === ".jpeg")) {
        return true;
      }
      if (token === "image/png" && ext === ".png") {
        return true;
      }
      if (token === "image/webp" && ext === ".webp") {
        return true;
      }
      if (token === "video/mp4" && ext === ".mp4") {
        return true;
      }
      if (token === "video/webm" && ext === ".webm") {
        return true;
      }
      return false;
    });

    if (!isAllowed) {
      return `File "${file.name}" has an unsupported format. Please upload ${formatDescription}.`;
    }

    return null;
  };

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (disabled) return;
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const filesToUpload = multiple ? files : [files[0]];
      const validFiles: File[] = [];

      for (const file of filesToUpload) {
        const error = validateFile(file);
        if (error) {
          toast({
            title: "Upload validation failed",
            description: error,
            variant: "destructive",
          });
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) return;

      // Track in uploading state
      const newItems: UploadingItem[] = validFiles.map((f) => ({
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: f.name,
        size: f.size,
        isPdf: f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      }));

      setUploadingFiles((prev) => [...prev, ...newItems]);

      const uploadedUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const uploadingMeta = newItems[i];
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const sanitizedFolder = folder.replace(/^\/+|\/+$/g, "");
          const storagePath = `${sanitizedFolder}/${Date.now()}_${cleanName}`;

          const publicUrl = await uploadStorageFile(bucket, storagePath, file);
          uploadedUrls.push(publicUrl);
        } catch (err: any) {
          toast({
            title: "Upload failed",
            description: err?.message || `Failed to upload "${file.name}". Please check your file and permissions.`,
            variant: "destructive",
          });
        } finally {
          setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadingMeta.id));
        }
      }

      if (uploadedUrls.length > 0) {
        if (multiple) {
          onChange([...value, ...uploadedUrls]);
        } else {
          onChange([uploadedUrls[0]]);
        }
        toast({
          title: "File uploaded successfully",
          description: `Uploaded ${uploadedUrls.length} file${uploadedUrls.length > 1 ? "s" : ""}.`,
        });
      }
    },
    [disabled, multiple, maxSizeMB, acceptTokens, formatDescription, folder, bucket, value, onChange, toast]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Reset input value so re-selecting same file triggers onChange
      e.target.value = "";
    }
  };

  const handleRemove = (indexToRemove: number) => {
    if (disabled) return;
    const newUrls = value.filter((_, idx) => idx !== indexToRemove);
    onChange(newUrls);
  };

  const isAtCapacity = !multiple && value.length >= 1;

  return (
    <div className={`space-y-3 ${className}`}>
      {label && <p className="text-xs font-medium text-slate-700">{label}</p>}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-5 transition-all text-center ${
          isDragging
            ? "border-[#1E3A5F] bg-[#1E3A5F]/5 scale-[0.99]"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/60"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#1E3A5F]">
            <UploadCloud className="h-5 w-5" />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-700">
              {isAtCapacity
                ? "Drop a file or choose to replace current file"
                : multiple
                ? "Drag & drop files here, or browse"
                : "Drag & drop file here, or browse"}
            </p>
            <p className="text-[11px] text-slate-500">{formatDescription}</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-1 h-7 text-xs border-slate-300 text-slate-700 hover:bg-white"
          >
            {isAtCapacity ? "Replace file" : multiple ? "Choose files" : "Choose file"}
          </Button>
        </div>
      </div>

      {/* In-Flight Uploading Indicator */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-1.5">
          {uploadingFiles.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-md border border-slate-200 bg-slate-50 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="h-4 w-4 animate-spin text-[#1E3A5F] shrink-0" />
                <span className="truncate font-medium text-slate-700">{item.name}</span>
                <span className="text-slate-400 text-[10px]">({formatFileSize(item.size)})</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#1E3A5F] tracking-wide shrink-0">
                Uploading...
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files Display */}
      {value.length > 0 && (
        <div className="space-y-2">
          {/* Images Grid */}
          {value.some((url) => !isPdfUrl(url) && !isVideoUrl(url)) && (
            <div className="flex flex-wrap gap-2.5">
              {value.map((url, idx) => {
                if (isPdfUrl(url) || isVideoUrl(url)) return null;
                const fileName = getCleanFileName(url);
                return (
                  <div
                    key={`${url}-${idx}`}
                    className="relative group rounded-md overflow-hidden border border-slate-200 bg-white w-24 h-24 sm:w-28 sm:h-28 shadow-xs"
                  >
                    <img
                      src={url}
                      alt={fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:text-black transition-colors"
                        title="View full size"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PDF Files List */}
          {value.some((url) => isPdfUrl(url)) && (
            <div className="space-y-1.5">
              {value.map((url, idx) => {
                if (!isPdfUrl(url)) return null;
                const fileName = getCleanFileName(url);
                return (
                  <div
                    key={`${url}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-slate-800 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">PDF Document</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                        title="Open PDF in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Remove PDF"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Video Files List */}
          {value.some((url) => isVideoUrl(url)) && (
            <div className="space-y-1.5">
              {value.map((url, idx) => {
                if (!isVideoUrl(url)) return null;
                const fileName = getCleanFileName(url);
                return (
                  <div
                    key={`${url}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1E3A5F] shrink-0">
                        <Video className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-slate-800 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Video File</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                        title="Open video in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Remove video"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
