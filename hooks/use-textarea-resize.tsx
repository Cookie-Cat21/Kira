import { useEffect, useRef } from "react";

/**
 * Auto-resizes a textarea to fit its content.
 * Inspired by Alwurts/chat-input on 21st.dev
 */
export function useTextareaResize(value: string, rows = 1) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const pt = parseFloat(style.paddingTop) || 0;
    const pb = parseFloat(style.paddingBottom) || 0;
    const min = lineHeight * rows + pt + pb;
    el.style.height = Math.max(el.scrollHeight, min) + "px";
  }, [value, rows]);

  return ref;
}
