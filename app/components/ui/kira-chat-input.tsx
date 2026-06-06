"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ArrowUp, Square, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/* --- TYPES --- */
interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: "pending" | "uploading" | "complete";
}

/* --- FILE PREVIEW CARD --- */
const FilePreviewCard: React.FC<{
  file: AttachedFile;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/") && file.preview;
  return (
    <div className="relative group flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-white/[0.07] transition-all hover:border-white/20 animate-pop-in">
      {isImage ? (
        <img
          src={file.preview!}
          alt={file.file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-white/10 rounded">
              <FileText className="w-3.5 h-3.5 text-white/40" />
            </div>
            <span className="text-[10px] font-medium text-white/35 uppercase tracking-wider truncate">
              {file.file.name.split(".").pop()}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-white/70 truncate" title={file.file.name}>
              {file.file.name}
            </p>
            <p className="text-[10px] text-white/35">{formatFileSize(file.file.size)}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => onRemove(file.id)}
        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
      {file.uploadStatus === "uploading" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

/* --- PASTED CONTENT CARD --- */
const PastedContentCard: React.FC<{
  content: { id: string; content: string };
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => (
  <div className="relative group flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-white/10 bg-white/[0.07] p-3 flex flex-col justify-between animate-pop-in">
    <p className="text-[10px] text-white/35 leading-[1.4] font-sans break-words whitespace-pre-wrap line-clamp-4 select-none">
      {content.content}
    </p>
    <div className="inline-flex items-center justify-center px-1.5 py-[2px] rounded border border-white/10 self-start">
      <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
        PASTED
      </span>
    </div>
    <button
      onClick={() => onRemove(content.id)}
      className="absolute top-2 right-2 p-[3px] bg-white/10 border border-white/10 rounded-full text-white/40 hover:text-white/80 transition-colors opacity-0 group-hover:opacity-100"
    >
      <X className="w-2 h-2" />
    </button>
  </div>
);

/* --- MAIN COMPONENT --- */
interface KiraChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  language?: "en" | "si" | "ta";
  onLanguageChange?: (lang: "en" | "si" | "ta") => void;
}

export function KiraChatInput({
  onSendMessage,
  isLoading = false,
  onCancel,
  placeholder = "Ask for a gift, budget, city, or order number...",
  className,
  language = "en" as "en" | "si" | "ta",
  onLanguageChange,
}: KiraChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<{ id: string; content: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [message]);

  const handleFiles = useCallback((newFilesList: FileList | File[]) => {
    const newFiles = Array.from(newFilesList).map((file) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: isImage ? "image/unknown" : file.type || "application/octet-stream",
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: "uploading" as const,
      };
    });
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((p) => (p.id === f.id ? { ...p, uploadStatus: "complete" } : p))
        );
      }, 600 + Math.random() * 600);
    });
  }, []);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
      return;
    }
    const text = e.clipboardData.getData("text");
    if (text.length > 300) {
      e.preventDefault();
      setPastedContent((prev) => [
        ...prev,
        { id: Math.random().toString(36).substr(2, 9), content: text },
      ]);
    }
  };

  const handleSend = () => {
    if (isLoading) {
      onCancel?.();
      return;
    }
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage("");
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = !!(message.trim() || files.length > 0 || pastedContent.length > 0);
  const canAct = hasContent || isLoading;

  return (
    <div
      className={cn("relative w-full", className)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
      }}
    >
      {/* Input container */}
      <div
        className={cn(
          "flex flex-col rounded-xl border border-white/[0.12] bg-white/[0.07] backdrop-blur-xl",
          "transition-all duration-200",
          "focus-within:border-[rgba(156,132,198,0.55)] focus-within:shadow-[0_0_0_1px_rgba(156,132,198,0.25),0_4px_24px_rgba(0,0,0,0.35)]",
          "shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
        )}
      >
        <div className="flex flex-col px-3 pt-3 pb-2 gap-2">
          {/* Attachments row */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-1">
              {pastedContent.map((c) => (
                <PastedContentCard
                  key={c.id}
                  content={c}
                  onRemove={(id) =>
                    setPastedContent((prev) => prev.filter((x) => x.id !== id))
                  }
                />
              ))}
              {files.map((f) => (
                <FilePreviewCard
                  key={f.id}
                  file={f}
                  onRemove={(id) =>
                    setFiles((prev) => prev.filter((x) => x.id !== id))
                  }
                />
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="min-h-[2rem] pl-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="w-full bg-transparent border-0 outline-none text-white/90 text-sm placeholder:text-white/30 resize-none overflow-hidden py-0 leading-relaxed block font-normal"
              style={{ minHeight: "1.5em" }}
            />
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-1.5">
            {/* Attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-white/35 hover:text-white/65 hover:bg-white/[0.07] transition-colors active:scale-95"
              type="button"
              aria-label="Attach file"
            >
              <Plus className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Language toggle */}
            {onLanguageChange && (
              <div className="flex items-center rounded-lg border border-white/[0.10] bg-white/[0.05] p-0.5 gap-0.5">
                {(["en", "si", "ta"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onLanguageChange(lang)}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-150 active:scale-95",
                      language === lang
                        ? "bg-kap-purple text-white shadow-[0_1px_6px_rgba(64,41,112,0.5)]"
                        : "text-white/35 hover:text-white/60"
                    )}
                    aria-label={lang === "en" ? "Reply in English" : lang === "si" ? "Reply in Sinhala" : "Reply in Tamil"}
                  >
                    {lang === "en" ? "EN" : lang === "si" ? "සිං" : "தமி"}
                  </button>
                ))}
              </div>
            )}

            {/* Send / Stop */}
            <button
              onClick={handleSend}
              disabled={!canAct}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-150 active:scale-95",
                canAct
                  ? "bg-kap-purple text-white shadow-[0_2px_12px_rgba(64,41,112,0.55)] hover:bg-kap-purple/85"
                  : "bg-white/[0.08] text-white/20 cursor-not-allowed"
              )}
              type="button"
              aria-label={isLoading ? "Stop" : "Send"}
            >
              {isLoading ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-black/60 border-2 border-dashed border-purple-400/50 rounded-xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Plus className="w-10 h-10 text-purple-400 mb-2 animate-bounce" />
          <p className="text-purple-300 font-medium text-sm">Drop files to attach</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default KiraChatInput;
