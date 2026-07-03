#!/usr/bin/env node
/**
 * generate-breakup-repair.mjs — Group Y (500 multilingual breakup/repair personas).
 * ~167 en + ~167 si + ~166 ta — breakup hand-deliver, anti-hand-deliver, angry-partner delivery.
 *
 * Run: node scripts/generate-breakup-repair.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "personas", "generated-breakup-repair.mjs");
const TARGET = 500;
const pad = (n) => String(n).padStart(3, "0");

const BASE = ["noToolLeak", "noFamilyUnsafe", "noHandDeliver"];
const CITIES = ["Colombo", "Kandy", "Galle", "Negombo", "Matara", "Jaffna", "Kurunegala"];

/** Message templates per language */
const TEMPLATES = {
  breakup_flowers: {
    en: (city) =>
      city
        ? `I broke up with my girlfriend and I'm heartbroken — need to send flowers, I'm in ${city}`
        : `I broke up with my girlfriend... I need to send some flowers`,
    si: (city) =>
      city
        ? `මගේ girlfriend එක්ක broke up වුනා heartbroken — flowers ටිකක් ඕන, මම ${city}`
        : `මගේ girlfriend එක්ක broke up වුනා... flowers ටිකක් යවන්න ඕන`,
    ta: (city) =>
      city
        ? `en girlfriend-oda break up aachu heartbroken — flowers venum, naan ${city}-la irukken`
        : `en girlfriend-oda break up aachu... flowers anuppa venum`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Breakup + flowers — hand-deliver tone",
  },
  breakup_roses: {
    en: (city) =>
      `she dumped me need roses${city ? ` deliver to me in ${city}` : ""} so I can give them to her`,
    si: (city) =>
      `අපේ break up වුනා roses ටිකක් ඕන${city ? ` ${city} ` : " "}oyata ship karala hand-deliver karanna`,
    ta: (city) =>
      `namma break up aachu roses venum${city ? ` ${city}-la ` : " "}ungalukku ship panni hand-deliver seiyanum`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Breakup + roses — hand-deliver",
  },
  breakup_bouquet: {
    en: () => `breakup with my gf yesterday — show me a flower bouquet I can take to her`,
    si: () => `gf එක්ක break up — flower bouquet ekak oyata ship karala hand-deliver karanna puluwan da`,
    ta: () => `gf-oda break up — flower bouquet ungalukku ship panni hand-deliver panna mudiyuma`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Breakup + bouquet",
  },
  anti_hand_deliver: {
    en: (city) =>
      `wife mad send roses ${city ?? "Colombo"} don't tell me to hand deliver`,
    si: (city) =>
      `wife kopa roses ${city ?? "Colombo"} hand deliver karamu beda Kapruka deliver karanna`,
    ta: (city) =>
      `wife kova roses ${city ?? "Colombo"} hand deliver venam illa Kapruka deliver pannunga`,
    checks: [...BASE, "products", ["noText", "hand.?deliver|pick up yourself"], "noFlowerJunk"],
    note: "Anti hand-deliver — Kapruka to her",
  },
  angry_deliver_her: {
    en: (city) => `my wife is angry send roses to her in ${city ?? "Colombo"}`,
    si: (city) => `wife kopa roses ${city ?? "Colombo"} her ekata deliver karanna`,
    ta: (city) => `wife kova roses ${city ?? "Colombo"} avanga kitai deliver pannunga`,
    checks: [...BASE, "noBreakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Angry partner — deliver to her not hand-deliver story",
  },
  breakup_ask: {
    en: () => `I broke up with my girlfriend what should I send her`,
    si: () => `gf එක්ක break up — eyata mokak da yawanne`,
    ta: () => `gf-oda break up — avanga kitai enna anuppanum`,
    checks: [...BASE, "breakupAiyoTone", "asksClarifyingOrProducts", "noHandDeliver"],
    note: "Breakup vague — Aiyo + clarify",
  },
  heartbroken_flowers: {
    en: (city) => `heartbroken after breakup need flowers${city ? ` in ${city}` : ""}`,
    si: (city) => `break up wuna heartbroken flowers ona${city ? ` ${city}` : ""}`,
    ta: (city) => `break up aachu heartbroken flowers venum${city ? ` ${city}` : ""}`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Heartbroken + flowers",
  },
  dumped_flowers: {
    en: () => `my girlfriend dumped me I need flowers to win her back`,
    si: () => `girlfriend මාව dumped කරා flowers ටිකක් ඕන`,
    ta: () => `girlfriend enna dumped pannita flowers venum`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Dumped + flowers",
  },
  breakup_note_card: {
    en: () => `broke up with her but sending roses anyway — add a note card?`,
    si: () => `break up wuna but roses yawanawa — note card ekak add karanna puluwan da`,
    ta: () => `break up aachu but roses anuppa — note card add pannalama`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Breakup + note card intent",
  },
  messed_up_flowers: {
    en: (city) => `I messed up we broke up send flowers to ${city ?? "Colombo"}`,
    si: (city) => `messed up break up flowers ${city ?? "Colombo"}`,
    ta: (city) => `messed up break up flowers ${city ?? "Colombo"}`,
    checks: [...BASE, "breakupHandDeliverTone", "noFlowerJunk", "productsOrHonestEmpty"],
    note: "Messed up + breakup + flowers",
  },
};

const LANGS = ["en", "si", "ta"];

function buildPersona(id, lang, templateKey, city, template) {
  const msgFn = template[lang];
  const msg = msgFn(city);
  const persona = {
    id,
    checks: template.checks,
    note: `${template.note} (${lang})`,
    request: {
      messages: [{ role: "user", content: msg }],
      cart: [],
      language: lang,
    },
  };
  if (lang === "en") persona.msg = msg;
  return persona;
}

function build() {
  const out = [];
  let n = 1;
  const templateKeys = Object.keys(TEMPLATES);

  // Round-robin: each language gets equal share; rotate templates + cities
  let ti = 0;
  while (out.length < TARGET) {
    const lang = LANGS[out.length % LANGS.length];
    const key = templateKeys[ti % templateKeys.length];
    const template = TEMPLATES[key];
    const city = CITIES[Math.floor(ti / LANGS.length) % CITIES.length];
    const useCity = ["breakup_flowers", "breakup_roses", "anti_hand_deliver", "angry_deliver_her", "heartbroken_flowers", "messed_up_flowers"].includes(key);
    out.push(buildPersona(`Y${pad(n++)}`, lang, key, useCity ? city : undefined, template));
    ti++;
  }

  return out.slice(0, TARGET);
}

const GROUP_Y = build();
const body = `/** AUTO-GENERATED — node scripts/generate-breakup-repair.mjs */
export const GROUP_Y = ${JSON.stringify(GROUP_Y, null, 2)};
export const BREAKUP_REPAIR_COUNT = ${GROUP_Y.length};
`;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`Wrote ${GROUP_Y.length} personas → ${OUT}`);
const byLang = { en: 0, si: 0, ta: 0 };
for (const p of GROUP_Y) {
  const lang = p.request?.language ?? "en";
  byLang[lang] = (byLang[lang] ?? 0) + 1;
}
console.log("By language:", byLang);
