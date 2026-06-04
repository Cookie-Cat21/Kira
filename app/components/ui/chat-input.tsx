"use client";

/**
 * ChatInput — inspired by Alwurts/chat-input on 21st.dev
 * Composable chat input with auto-resize, context-shared state,
 * and an animated submit button.
 *
 * Usage:
 *   <ChatInput value={v} setValue={setV} onSubmit={send} isLoading={loading}>
 *     <ChatInputTextArea />
 *     <ChatInputSubmit />
 *   </ChatInput>
 */

import React, { createContext, useContext } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useTextareaResize } from "@/hooks/use-textarea-resize";
import { cn } from "@/lib/utils";

interface ChatInputCtx {
  value: string;
  setValue: (v: string) => void;
  isLoading: boolean;
  onSubmit: (v: string) => void;
  onCancel?: () => void;
}

const Ctx = createContext<ChatInputCtx | null>(null);

function useChatInput() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Must be used inside <ChatInput>");
  return ctx;
}

// ── Root wrapper ─────────────────────────────────────────────────────────────

interface ChatInputProps extends React.PropsWithChildren {
  value: string;
  setValue: (v: string) => void;
  isLoading?: boolean;
  onSubmit: (v: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function ChatInput({
  value,
  setValue,
  isLoading = false,
  onSubmit,
  onCancel,
  children,
  className,
}: ChatInputProps) {
  return (
    <Ctx.Provider value={{ value, setValue, isLoading, onSubmit, onCancel }}>
      <div
        className={cn(
          "relative flex flex-col rounded-lg border border-kira-line bg-white px-4 pb-12 pt-3 shadow-sm",
          "transition-shadow focus-within:border-kira-border-focus focus-within:shadow-md",
          className
        )}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

interface ChatInputTextAreaProps {
  placeholder?: string;
  className?: string;
}

export function ChatInputTextArea({
  placeholder = "Message Kira...",
  className,
}: ChatInputTextAreaProps) {
  const { value, setValue, isLoading, onSubmit } = useChatInput();
  const ref = useTextareaResize(value, 1);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (value.trim() && !isLoading) onSubmit(value);
        }
      }}
      placeholder={placeholder}
      disabled={isLoading}
      rows={1}
      className={cn(
        "w-full resize-none border-0 bg-transparent text-kira-text placeholder:text-kira-muted",
        "text-sm leading-relaxed outline-none disabled:cursor-not-allowed",
        "max-h-[120px] overflow-y-auto",
        className
      )}
    />
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────

interface ChatInputSubmitProps {
  className?: string;
}

export function ChatInputSubmit({ className }: ChatInputSubmitProps) {
  const { value, isLoading, onSubmit, onCancel } = useChatInput();
  const canSubmit = value.trim().length > 0;
  const active = canSubmit || isLoading;

  return (
    <button
      type="button"
      onClick={() => {
        if (isLoading) {
          onCancel?.();
          return;
        }
        if (canSubmit && !isLoading) onSubmit(value);
      }}
      disabled={!active}
      aria-label={isLoading ? "Stop" : "Send"}
      className={cn(
        "absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-lg transition-all duration-150",
        active
          ? "bg-kap-purple text-white shadow-sm hover:bg-kap-purple/90 active:scale-95"
          : "bg-gray-100 text-gray-400 cursor-not-allowed",
        className
      )}
    >
      {isLoading ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <ArrowUp className="h-4 w-4" />
      )}
    </button>
  );
}
