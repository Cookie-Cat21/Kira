/**
 * agent-auto-fix.mjs — apply safe automated fixes from agent-loop failure patterns.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEARCH_PATH = join(ROOT, "lib/kira/search-fast-paths.ts");
const PROMPT_PATH = join(ROOT, "lib/kira-prompt.ts");

/**
 * @param {Array<{ id: string, msg?: string, reasons: string[], group?: string }>} failures
 * @returns {Promise<string[]>} descriptions of fixes applied
 */
export async function applyAgentFixes(failures) {
  const applied = [];
  if (!failures.length) return applied;

  let searchSrc = await readFile(SEARCH_PATH, "utf8").catch(() => "");
  let promptSrc = await readFile(PROMPT_PATH, "utf8").catch(() => "");
  let searchChanged = false;
  let promptChanged = false;

  for (const f of failures) {
    const msg = (f.msg ?? "").toLowerCase();
    const reasons = (f.reasons ?? []).join(" ");

    // Missing products on popular/trending
    if (
      /popular|trending|what'?s good/i.test(msg) &&
      /products|carousel|search/i.test(reasons)
    ) {
      if (searchSrc && !searchSrc.includes("POPULAR_RE")) {
        // Should already exist — log only
        applied.push(`noted: popular browse failure ${f.id} (fast-path should handle)`);
      }
    }

    // Repair / angry partner without products
    if (
      /angry|mad|pissed|messed up|sorry|wife|gf|partner/i.test(msg) &&
      /flower|rose|chocolate|send|deliver/i.test(msg) &&
      /products|missing_products/i.test(reasons)
    ) {
      if (searchSrc && !searchSrc.includes("REPAIR_GIFT_RE")) {
        applied.push(`noted: repair flow failure ${f.id}`);
      }
    }

    // Global shop / amazon
    if (/amazon|ebay|global shop/i.test(msg) && /text|global|imported/i.test(reasons)) {
      if (searchSrc.includes("GLOBAL_SHOP_RE")) {
        applied.push(`noted: global shop ${f.id} — fast-path present`);
      }
    }

    // Sinhala leak in EN mode
    if (/noLang|no si Unicode|noUnicode\("si"\)/i.test(reasons)) {
      const rule =
        '- **English mode with romanized Sinhala/Tamil words** (amma, machang, lah): reply in Tanglish only — zero Sinhala/Tamil Unicode.';
      if (promptSrc && !promptSrc.includes("English mode with romanized")) {
        const anchor = "## Sinhala output rules";
        if (promptSrc.includes(anchor)) {
          promptSrc = promptSrc.replace(anchor, `${rule}\n\n${anchor}`);
          promptChanged = true;
          applied.push("prompt: strengthened EN-mode romanized SL rule");
        }
      }
    }

    // Tamil mode missing Unicode
    if (/Expected ta Unicode|hasUnicode\("ta"\)/i.test(reasons)) {
      const fewShot = `
User: [language=ta, user writes English] "flowers for my wife"
Think: Tamil mode selected → reply in Tamil Unicode
Say: [Tamil reply asking flower preference or searching]`;
      if (promptSrc && !promptSrc.includes("language=ta")) {
        promptSrc = promptSrc.replace("## Few-shots", `## Few-shots${fewShot}`);
        promptChanged = true;
        applied.push("prompt: added Tamil mode few-shot");
      }
    }

    // Bare greeting re-intro
    if (/hey|hi|hello/i.test(msg) && msg.split(/\s+/).length <= 2 && /I'm Kira|Welcome back/i.test(reasons)) {
      const rule =
        '- **Bare greeting after welcome**: never say "Hey, I\'m Kira" again — continue the thread naturally.';
      if (promptSrc && !promptSrc.includes("Bare greeting after welcome")) {
        promptSrc = promptSrc.replace(
          "**Already greeted this thread?**",
          `${rule}\n- **Already greeted this thread?**`
        );
        promptChanged = true;
        applied.push("prompt: reinforced no re-intro on bare greeting");
      }
    }
  }

  if (searchChanged) await writeFile(SEARCH_PATH, searchSrc);
  if (promptChanged) await writeFile(PROMPT_PATH, promptSrc);

  return [...new Set(applied)];
}
