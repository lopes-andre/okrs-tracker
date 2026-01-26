"use client";

import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link,
  Quote,
  Code,
  Eye,
  Edit3,
  CheckSquare,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  maxLength?: number;
  showCharCount?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  hint?: string;
}

export interface MarkdownEditorRef {
  focus: () => void;
  insertText: (text: string) => void;
}

// ============================================================================
// SIMPLE MARKDOWN RENDERER
// ============================================================================

/**
 * Validate URL for safe protocols only.
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Block dangerous protocols
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("file:")
  ) {
    return false;
  }
  // Allow http, https, mailto, tel, and relative URLs
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    !trimmed.includes(":")
  ) {
    return true;
  }
  return false;
}

function renderMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-text-strong mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-text-strong mt-4 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-text-strong mt-4 mb-2">$1</h2>')
    // Bold and Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del class="text-text-muted">$1</del>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-bg-1 rounded text-sm font-mono">$1</code>')
    // Links - with URL validation to prevent XSS
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, linkText, url) => {
        if (isSafeUrl(url)) {
          return `<a href="${url}" class="text-accent hover:underline" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        }
        // Unsafe URL - render as plain text
        return linkText;
      }
    )
    // Blockquotes
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-2 border-accent pl-3 italic text-text-muted my-2">$1</blockquote>'
    )
    // Task lists (must come before regular lists)
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2 ml-4"><span class="text-status-success">✓</span><span class="line-through text-text-muted">$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2 ml-4"><span class="text-text-muted">○</span><span>$1</span></li>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-border-soft" />')
    // Line breaks
    .replace(/\n\n/g, "</p><p class='my-2'>")
    .replace(/\n/g, "<br />");

  // Wrap consecutive list items
  html = html.replace(
    /(<li[^>]*>.*?<\/li>\s*)+/g,
    (match) => `<ul class="my-2 space-y-1">${match}</ul>`
  );

  return `<p class="my-2">${html}</p>`;
}

// ============================================================================
// MARKDOWN EDITOR COMPONENT
// ============================================================================

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      value,
      onChange,
      placeholder = "Write your thoughts...",
      minHeight = 150,
      maxHeight = 400,
      maxLength,
      showCharCount = true,
      disabled = false,
      className,
      label,
      hint,
    },
    ref
  ) {
    const [isPreview, setIsPreview] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      insertText: (text: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);
        onChange(newValue);
        // Restore cursor position
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(start + text.length, start + text.length);
          textareaRef.current?.focus();
        }, 0);
      },
    }));

    // Insert formatting at cursor position
    const insertFormat = useCallback(
      (before: string, after: string = "", placeholder: string = "") => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const selectedText = value.substring(start, end);
        const textToInsert = selectedText || placeholder;

        const newValue =
          value.substring(0, start) + before + textToInsert + after + value.substring(end);

        onChange(newValue);

        // Position cursor
        setTimeout(() => {
          const newCursorPos = start + before.length + (selectedText ? selectedText.length : 0);
          textareaRef.current?.setSelectionRange(
            selectedText ? newCursorPos + after.length : start + before.length,
            selectedText ? newCursorPos + after.length : start + before.length + placeholder.length
          );
          textareaRef.current?.focus();
        }, 0);
      },
      [value, onChange]
    );

    // Insert at line start
    const insertLineStart = useCallback(
      (prefix: string) => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);

        onChange(newValue);

        setTimeout(() => {
          const newPos = start + prefix.length;
          textareaRef.current?.setSelectionRange(newPos, newPos);
          textareaRef.current?.focus();
        }, 0);
      },
      [value, onChange]
    );

    // Toolbar actions
    const actions = [
      {
        icon: Bold,
        label: "Bold",
        action: () => insertFormat("**", "**", "bold text"),
        shortcut: "Ctrl+B",
      },
      {
        icon: Italic,
        label: "Italic",
        action: () => insertFormat("*", "*", "italic text"),
        shortcut: "Ctrl+I",
      },
      { type: "divider" as const },
      {
        icon: Heading2,
        label: "Heading 2",
        action: () => insertLineStart("## "),
      },
      {
        icon: Heading3,
        label: "Heading 3",
        action: () => insertLineStart("### "),
      },
      { type: "divider" as const },
      {
        icon: List,
        label: "Bullet List",
        action: () => insertLineStart("- "),
      },
      {
        icon: ListOrdered,
        label: "Numbered List",
        action: () => insertLineStart("1. "),
      },
      {
        icon: CheckSquare,
        label: "Task List",
        action: () => insertLineStart("- [ ] "),
      },
      { type: "divider" as const },
      {
        icon: Quote,
        label: "Quote",
        action: () => insertLineStart("> "),
      },
      {
        icon: Code,
        label: "Code",
        action: () => insertFormat("`", "`", "code"),
      },
      {
        icon: Link,
        label: "Link",
        action: () => insertFormat("[", "](url)", "link text"),
      },
    ];

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case "b":
              e.preventDefault();
              insertFormat("**", "**", "bold text");
              break;
            case "i":
              e.preventDefault();
              insertFormat("*", "*", "italic text");
              break;
            case "k":
              e.preventDefault();
              insertFormat("[", "](url)", "link text");
              break;
          }
        }
      },
      [insertFormat]
    );

    const charCount = value.length;
    const isOverLimit = maxLength ? charCount > maxLength : false;

    return (
      <div className={cn("space-y-2", className)}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-text-strong">{label}</label>
        )}

        {/* Editor Container */}
        <div className="border border-border-soft rounded-card overflow-hidden bg-bg-0 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border-soft bg-bg-1/50">
            {actions.map((action, index) =>
              action.type === "divider" ? (
                <div key={index} className="w-px h-5 bg-border-soft mx-1" />
              ) : (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={action.action}
                  disabled={disabled || isPreview}
                  title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                  className="h-7 w-7"
                >
                  <action.icon className="w-4 h-4" />
                </Button>
              )
            )}

            <div className="flex-1" />

            {/* Preview Toggle */}
            <Button
              type="button"
              variant={isPreview ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="h-7 gap-1.5 text-xs"
            >
              {isPreview ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {/* Editor / Preview Area */}
          {isPreview ? (
            <div
              className="px-3 py-2 prose prose-sm max-w-none overflow-auto text-text-default"
              style={{ minHeight, maxHeight }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "w-full px-3 py-2 resize-none bg-transparent",
                "text-sm text-text-default placeholder:text-text-muted",
                "focus:outline-none",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{ minHeight, maxHeight }}
            />
          )}

          {/* Footer */}
          {showCharCount && (
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-soft bg-bg-1/30 text-xs">
              <span className="text-text-muted">
                Supports **bold**, *italic*, lists, and [links](url)
              </span>
              <span
                className={cn(
                  "font-mono",
                  isOverLimit ? "text-status-danger" : "text-text-muted"
                )}
              >
                {charCount}
                {maxLength && ` / ${maxLength}`}
              </span>
            </div>
          )}
        </div>

        {/* Hint */}
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);

// ============================================================================
// MARKDOWN PREVIEW COMPONENT (Standalone)
// ============================================================================

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  if (!content) {
    return <p className={cn("text-text-muted italic", className)}>No content</p>;
  }

  return (
    <div
      className={cn("prose prose-sm max-w-none text-text-default", className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { renderMarkdown };
