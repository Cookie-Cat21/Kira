/**
 * context-relevance.mjs — Multi-turn: carousel must match CURRENT user turn category.
 */
import { detectSearchCategories, validateSearchRelevance } from "./search-relevance.mjs";

function priorUserText(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return "";
  const users = messages.filter((m) => m.role === "user");
  if (users.length < 2) return "";
  return users.slice(0, -1).map((m) => m.content).join(" ");
}

function currentUserText(messages) {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i].content ?? "";
  }
  return "";
}

/**
 * Fail when user switched category but carousel doesn't match the current message.
 */
export function validateNoContextBleed(messages, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { pass: true, violations: [] };
  }

  const current = currentUserText(messages);
  const prior = priorUserText(messages);
  if (!current || !prior) return { pass: true, violations: [] };

  const currentCats = detectSearchCategories(current);
  const priorCats = detectSearchCategories(prior);
  if (currentCats.length === 0 || priorCats.length === 0) return { pass: true, violations: [] };
  if (currentCats[0] === priorCats[0]) return { pass: true, violations: [] };

  const rel = validateSearchRelevance(current, products);
  if (!rel.pass) {
    return {
      pass: false,
      violations: rel.violations.map((v) => `Context bleed: ${v}`),
    };
  }
  return { pass: true, violations: [] };
}

export function buildMessagesFromPersona(persona) {
  if (persona.request?.messages) return persona.request.messages;
  if (persona.msg) return [{ role: "user", content: persona.msg }];
  return [];
}
