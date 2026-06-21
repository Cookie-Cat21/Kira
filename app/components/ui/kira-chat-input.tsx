"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/app/components/ui/LanguageSwitcher";

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
  placeholder = "Ask for a gift, budget, city, or order number…",
  className,
  language = "en",
  onLanguageChange,
}: KiraChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [message]);

  const handleSend = () => {
    if (isLoading) {
      onCancel?.();
      return;
    }
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canAct = !!message.trim() || isLoading;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex flex-col rounded-2xl border border-kira-border bg-white shadow-sm",
          "transition-shadow duration-200",
          "focus-within:border-kap-purple/40 focus-within:ring-2 focus-within:ring-kap-purple/15"
        )}
      >
        <div className="flex flex-col gap-2 px-4 py-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none overflow-hidden border-0 bg-transparent py-1 text-[17px] leading-relaxed text-kira-text outline-none placeholder:text-kira-muted"
            style={{ minHeight: "1.5em" }}
          />

          <div className="flex items-center gap-2">
            {onLanguageChange && (
              <LanguageSwitcher
                language={language}
                onChange={onLanguageChange}
              />
            )}

            <div className="flex-1" />

            <button
              onClick={handleSend}
              disabled={!canAct}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl transition-colors",
                canAct
                  ? "bg-kap-purple text-white hover:bg-kap-purple/90"
                  : "bg-[#f5f5f7] text-kira-muted"
              )}
              type="button"
              aria-label={isLoading ? "Stop" : "Send"}
            >
              {isLoading ? (
                <Square className="size-4 fill-current" />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KiraChatInput;
