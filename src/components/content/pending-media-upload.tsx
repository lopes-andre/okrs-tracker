"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Image, Video, FileText, AlertCircle, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface PendingVideoLink {
  id: string;
  url: string;
  title: string;
}

interface PendingMediaUploadProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  videoLinks?: PendingVideoLink[];
  onAddVideoLink?: (url: string, title: string) => void;
  onRemoveVideoLink?: (id: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMediaIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return Image;
  } else if (fileType.startsWith("video/")) {
    return Video;
  }
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File type not supported: ${file.type}. Supported: jpg, png, webp, gif, pdf`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${formatFileSize(file.size)}. Max: 10MB`;
  }
  return null;
}

function getVideoPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("vimeo.com")) return "Vimeo";
  if (url.includes("sharepoint.com")) return "SharePoint";
  if (url.includes("loom.com")) return "Loom";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Video";
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PendingMediaUpload({
  files,
  onAddFiles,
  onRemoveFile,
  videoLinks = [],
  onAddVideoLink,
  onRemoveVideoLink,
}: PendingMediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const validFiles: File[] = [];
      const newErrors: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const error = validateFile(file);
        if (error) {
          newErrors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }

      setErrors(newErrors);
      if (validFiles.length > 0) {
        onAddFiles(validFiles);
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAddFiles]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // Create preview URL for image files
  const getPreviewUrl = useCallback((file: File): string | null => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  }, []);

  // Handle video link submission
  const handleAddVideoLink = useCallback(() => {
    if (!videoUrl.trim() || !onAddVideoLink) return;
    onAddVideoLink(videoUrl.trim(), videoTitle.trim() || getVideoPlatform(videoUrl.trim()));
    setVideoUrl("");
    setVideoTitle("");
    setShowVideoForm(false);
  }, [videoUrl, videoTitle, onAddVideoLink]);

  return (
    <div className="space-y-4">
      {/* Upload area and actions */}
      <div className="flex gap-3">
        {/* Drop Zone */}
        <div
          className={cn(
            "flex-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-accent bg-accent/5"
              : "border-border-soft hover:border-border"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          <div className="flex items-center justify-center gap-2">
            <Upload className="w-5 h-5 text-text-muted" />
            <span className="text-small text-text-muted">
              Drop files or click to upload
            </span>
          </div>
        </div>

        {/* Add video link button */}
        {onAddVideoLink && (
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => setShowVideoForm(true)}
            disabled={showVideoForm}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Add Video Link
          </Button>
        )}
      </div>

      {/* Video link form */}
      {showVideoForm && onAddVideoLink && (
        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-1">
          <div className="space-y-1.5">
            <Label htmlFor="pending-video-url" className="text-small">Video URL</Label>
            <Input
              id="pending-video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
            />
            <p className="text-xs text-text-muted">
              YouTube, Vimeo, SharePoint, Loom, or any video URL
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pending-video-title" className="text-small">Title (optional)</Label>
            <Input
              id="pending-video-title"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Video title"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowVideoForm(false);
                setVideoUrl("");
                setVideoTitle("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleAddVideoLink}
              disabled={!videoUrl.trim()}
            >
              Add Video
            </Button>
          </div>
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-small text-status-danger"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Media Grid (Files + Video Links) */}
      {(files.length > 0 || videoLinks.length > 0) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Files */}
          {files.map((file, index) => {
            const Icon = getMediaIcon(file.type);
            const isImage = file.type.startsWith("image/");
            const previewUrl = getPreviewUrl(file);

            return (
              <div
                key={`file-${file.name}-${index}`}
                className="relative group rounded-lg border border-border-soft overflow-hidden bg-bg-1"
              >
                {isImage && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-24 object-cover"
                    loading="lazy"
                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-text-muted" />
                  </div>
                )}

                {/* Overlay with delete button */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(index);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File info */}
                <div className="p-2 border-t border-border-soft">
                  <p className="text-xs text-text-muted truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Video Links */}
          {videoLinks.map((link) => (
            <div
              key={`video-${link.id}`}
              className="relative group rounded-lg border border-border-soft overflow-hidden bg-bg-1"
            >
              <div className="w-full h-24 flex flex-col items-center justify-center">
                <Video className="w-8 h-8 text-text-muted" />
                <span className="text-[10px] text-text-muted mt-1">
                  {getVideoPlatform(link.url)}
                </span>
              </div>

              {/* Video link badge */}
              <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-medium">
                Link
              </div>

              {/* Overlay with delete button */}
              {onRemoveVideoLink && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveVideoLink(link.id);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Link info */}
              <div className="p-2 border-t border-border-soft">
                <p className="text-xs text-text-muted truncate" title={link.title || link.url}>
                  {link.title || link.url}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-text-muted">
          <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-small">No media attached</p>
          <p className="text-xs">Upload images, PDFs, or add video links</p>
        </div>
      )}
    </div>
  );
}
