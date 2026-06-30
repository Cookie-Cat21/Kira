/** Strip model tool-call markup that must never reach the user. */
const TOOL_BLOCK_RE = /<function=[^>]*>[\s\S]*?<\/function>/gi;
const TOOL_OPEN_TAIL_RE = /<function=[^>]*>\{[\s\S]*$/gi;
const TOOL_OPEN_RE = /<function=[^>]*>/gi;
const TOOL_CLOSE_RE = /<\/function>/gi;

export function sanitizeAssistantText(text: string): string {
  return (text ?? "")
    .replace(TOOL_BLOCK_RE, "")
    .replace(TOOL_OPEN_TAIL_RE, "")
    .replace(TOOL_OPEN_RE, "")
    .replace(TOOL_CLOSE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasToolMarkupLeak(text: string): boolean {
  return /<function=|kapruka_search_products>\s*\{|kapruka_create_order>\s*\{/i.test(text ?? "");
}

/** Generic carousel intros that score poorly on founder review. */
export const GENERIC_CAROUSEL_COPY_RE =
  /^here are \d+ picks\b|here are kapruka'?s top picks right now/i;

export function hasGenericCarouselCopy(text: string): boolean {
  return GENERIC_CAROUSEL_COPY_RE.test((text ?? "").trim());
}
