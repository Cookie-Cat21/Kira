import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import {
  buildSandboxCheckoutInfo,
  isSandboxCheckout,
} from "@/lib/checkout-sandbox";
import {
  getColomboTodayIso,
  getColomboTomorrowIso,
  parseRelativeDeliveryDate,
} from "@/lib/colombo-date";
import { getMcpClient, invalidateMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import { resolveMcpProductId } from "@/lib/product-id";
import {
  extractCheckoutInfoFromMcp,
  extractDeliveryInfoFromMcp,
  extractProductDetailsFromMcp,
  extractProductsFromMcp,
  extractTrackingFromMcp,
  formatMcpContentForModel,
  parseMcpPayload,
} from "@/lib/mcp-parsing";
import type {
  CartItem,
  ChatRequest,
  CheckoutInfo,
  DeliveryQuote,
  KiraProduct,
  LastOrder,
  TrackingItem,
} from "@/types";

let _groq: Groq | undefined;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
  return _groq;
}
// Free-tier model cascade: most capable first, fall back on 429.
//   1. Llama 3.3 70B  — best personality, 100k tokens/day free budget
//   2. Llama 4 Scout  — generous 30k TPM headroom
//   3. Llama 3.1 8B   — highest free limits, last resort
const MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-8b-instant",
];
const MAX_TOOL_ROUNDS = 4;

const SERVER_CITY_REGEX =
  /\b(colombo|kandy|galle|negombo|jaffna|kurunegala|ratnapura|anuradhapura|batticaloa|trincomalee|matara|hambantota|vavuniya|polonnaruwa|kegalle|nuwara eliya|badulla|kalutara|gampaha)\b/i;

// When a query maps to a specific category, keep only products whose name OR
// category contains at least one of these terms. Blocks off-category noise like
// kids bags whose names happen to include the search keyword (e.g. "Sofia Flowers").
const CATEGORY_RELEVANCE_TERMS: Record<string, RegExp> = {
  flowers: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
  roses: /flower|rose|bouquet|floral|arrangement|blossom|orchid|lily|tulip/i,
};

// Products that pass RELEVANCE but are clearly not in the category — reject them.
// "3D Kids Preschool Bag Double Pocket Sofia Flower" passes the flowers filter
// because "Flower" appears in the name, but it's a bag, not a flower.
const CATEGORY_IRRELEVANCE_TERMS: Record<string, RegExp> = {
  flowers: /\b(bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery)\b/i,
  roses: /\b(bag|backpack|school\s*bag|preschool\s*bag|handbag|purse|wallet|luggage|suitcase|tote|kids\s*bag|pouch|pencil\s*case|stationery)\b/i,
};

const CATEGORY_QUERY_MAP: Record<string, string> = {
  cakes: "cake",
  cake: "cake",
  flowers: "flowers",
  flower: "flowers",
  chocolates: "chocolate",
  chocolate: "chocolate",
  electronics: "electronics",
  fashion: "clothing",
  clothing: "clothing",
  hampers: "gift hamper",
  hamper: "gift hamper",
  grocery: "grocery",
  toys: "soft toy",
  home: "home lifestyle",
};

const BAKERY_BRANDS: Record<string, string> = {
  hilton: "hilton",
  breadtalk: "breadtalk",
  galadari: "galadari",
  "java lounge": "java",
  "shangri-la": "shangri-la",
  shangrila: "shangri-la",
  kingsbury: "kingsbury",
  cinnamon: "cinnamon",
};

const REORDER_SESSION_RE =
  /\b(order again|buy again|same as last|same thing|what i had|repeat order|reorder)\b/i;
const REORDER_REF_RE = /\b(?:reorder|order again)\s+(KP[\s-]?\d+)\b/i;
// Matches relationship-repair scenarios in EITHER word order — "wife is mad" and
// "got drunk, wife is upset" both fire. "sorry"/"fix" were dropped: too broad
// ("sorry, my wife needs chocolates" / "fix dinner for my wife" are not repairs).
const REPAIR_RELATION = "wife|husband|gf|girlfriend|boyfriend|partner|spouse";
const REPAIR_EMOTION = "angry|mad|pissed|furious|messed up|drunk|fight|fighting|upset";
const REPAIR_GIFT_RE = new RegExp(
  `(?:\\b(?:${REPAIR_RELATION})\\b.{0,60}\\b(?:${REPAIR_EMOTION})\\b)|` +
    `(?:\\b(?:${REPAIR_EMOTION})\\b.{0,60}\\b(?:${REPAIR_RELATION})\\b)`,
  "i"
);
const REPAIR_INSIST_RE = /\b(just send|deliver it|send it anyway|no just send)\b/i;
const RUSH_RE = /\b(today|urgent|asap|rush|same.?day|right now|need it now)\b/i;
const SALE_RE = /\b(on sale|discount|deal|offer|clearance|budget pick)\b/i;
const HAMPER_RE = /\b(hamper|gift set|combo pack|gift box|gift basket)\b/i;
const GLOBAL_SHOP_RE = /\b(amazon|ebay|global shop|imported from)\b/i;

// Common misspellings corrected before hitting MCP search.
const SEARCH_SPELLING_MAP: Record<string, string> = {
  stationary: "stationery",
  jewllery: "jewellery",
  jewlery: "jewellery",
  jewlry: "jewellery",
  choclate: "chocolate",
  chocalate: "chocolate",
  baloons: "balloons",
  ballon: "balloon",
  teddybear: "teddy bear",
};

// ─── Localized UI strings ────────────────────────────────────────────────────
// All fixed-text messages surfaced to users, in en / si / ta.
// Use L(key, lang) for static strings, Lf(key, lang, vars) for templated ones.
const LS: Record<string, Record<string, string>> = {
  trackingAskOrderNumber: {
    en: "Sure — send me the Kapruka order number from the confirmation email, and I'll check the status for you.",
    si: "හොඳයි — confirmation email එකෙන් Kapruka order number එක දෙන්නකෝ, status check කරන්නම්.",
    ta: "சரி — confirmation email-இல் உள்ள Kapruka ஆர்டர் எண்ணை அனுப்புங்கள், நான் status பார்க்கிறேன்.",
  },
  trackingFound: {
    en: "I found order {orderNumber}: {status}.",
    si: "Order {orderNumber} හොයාගත්තා: {status}.",
    ta: "Order {orderNumber} கிடைத்தது: {status}.",
  },
  trackingNotFound: {
    en: "I couldn't track {orderNumber}. {reason}",
    si: "Order {orderNumber} track කරන්නේ බෑ. {reason}",
    ta: "Order {orderNumber} track செய்ய முடியவில்லை. {reason}",
  },
  checkoutEmptyCart: {
    en: "Add a product first and I'll help you checkout.",
    si: "පළමුව product එකක් add කරන්නකෝ, ඊට පස්සේ checkout කරමු.",
    ta: "முதலில் ஒரு பொருளை சேர்க்கவும், பிறகு checkout செய்யலாம்.",
  },
  checkoutNeedName: {
    en: "Lovely. Before I create a live Kapruka checkout link, I need the recipient's full name.",
    si: "හොඳයි! Live Kapruka checkout link හදන්න recipient ගේ full name ඕනෑ.",
    ta: "நல்லது! Live Kapruka checkout link உருவாக்க recipient இன் full name தேவை.",
  },
  checkoutNeedPhone: {
    en: "Lovely, I have the recipient and address. What's the recipient's phone number?",
    si: "හොඳයි, recipient සහ address තියෙනවා. Recipient ගේ phone number එක මොකක්ද?",
    ta: "நல்லது, recipient மற்றும் address இருக்கிறது. Recipient phone number என்ன?",
  },
  checkoutNeedAddress: {
    en: "Lovely, I have the recipient and phone number. What's the full street address?",
    si: "හොඳයි, recipient සහ phone number තියෙනවා. Full street address එක මොකක්ද?",
    ta: "நல்லது, recipient மற்றும் phone number இருக்கிறது. Full street address என்ன?",
  },
  reshowNothingInStock: {
    en: "Checked Kapruka again — nothing in stock right now. Want to try a different category or search?",
    si: "Kapruka නැවත check කළා — stock නෑ. වෙනත් category try කරමුද?",
    ta: "Kapruka மீண்டும் சரிபார்த்தேன் — stock இல்லை. வேறு category try செய்யலாமா?",
  },
  reshowNothingFoundQuery: {
    en: "I checked Kapruka live for \"{query}\" — nothing in stock right now. Want to try a different category?",
    si: "Kapruka check කළා \"{query}\" — stock නෑ. වෙනත් category try කරමුද?",
    ta: "Kapruka-ல் \"{query}\" சரிபார்த்தேன் — stock இல்லை. வேறு category try செய்யலாமா?",
  },
  reshowRealListings: {
    en: "Here are the real listings{budget} from Kapruka — {n} in stock right now.",
    si: "Kapruka real listings{budget} — {n} stock හිඳිනා.",
    ta: "Kapruka உண்மையான listings{budget} — {n} stock இல் உள்ளவை.",
  },
  reshowHereYouGo: {
    en: "Here you go{budget}! {n} picks from Kapruka.",
    si: "ඒ මෙන්න{budget}! Kapruka options {n}.",
    ta: "இதோ{budget}! Kapruka-இல் {n} options.",
  },
  reshowHereYouGoOne: {
    en: "Here you go{budget}! One pick from Kapruka.",
    si: "ඒ මෙන්න{budget}! Kapruka option.",
    ta: "இதோ{budget}! Kapruka-இல் ஒரு option.",
  },
  reshowHereItems: {
    en: "Here they are — {n} items with pictures.",
    si: "ඒ items {n} — pictures සමග.",
    ta: "இதோ {n} items — pictures உடன்.",
  },
  reshowHereItemsSingle: {
    en: "Here it is — the item with pictures.",
    si: "ඒ item — picture සමග.",
    ta: "இதோ item — picture உடன்.",
  },
  moreOptionsSamePicks: {
    en: "Hmm, Kapruka's showing the same picks — want to try a different category or price range?",
    si: "Hmm, Kapruka ම picks — වෙනත් category හෝ price range try කරමුද?",
    ta: "Hmm, Kapruka அதே picks — வேறு category அல்லது price range try செய்யலாமா?",
  },
  moreOptionsAboutAll: {
    en: "Honestly, that's about all Kapruka has for {query} right now. Want to try a different category or drop the budget filter?",
    si: "Honestly, Kapruka {query} — ඒ ඒවාමයි. Category change කරමුද?",
    ta: "Honestly, Kapruka-இல் {query} க்கு இவை மட்டுமே. வேறு category try செய்யலாமா?",
  },
  moreOptionsHere: {
    en: "Here are some more options{budget} — sorted by price this time.",
    si: "More options{budget} — price order.",
    ta: "மேலும் options{budget} — price வரிசையில்.",
  },
  searchNothingFound: {
    en: "Checked Kapruka live - nothing in stock for \"{query}\" right now. Want me to try a different term or category?",
    si: "Kapruka check කළා — \"{query}\" stock නෑ. වෙනත් term try කරමුද?",
    ta: "Kapruka சரிபார்த்தேன் — \"{query}\" stock இல்லை. வேறு term try செய்யலாமா?",
  },
  searchFoundOne: {
    en: "Found one option{budget}{city}{date} — here's what's in stock:",
    si: "Option 1{budget}{city}{date} — stock හිඳිනා:",
    ta: "ஒரு option{budget}{city}{date} — stock இல் உள்ளது:",
  },
  searchFoundMany: {
    en: "Here are {n} picks{budget}{city}{date} — all in stock on Kapruka right now.",
    si: "Kapruka {n} options{budget}{city}{date} — stock හිඳිනා.",
    ta: "Kapruka-இல் {n} options{budget}{city}{date} — stock இல் உள்ளவை.",
  },
  rateExhausted: {
    en: "Aiyo, I'm a bit slammed right now — all my thinking servers are busy 🙏 Give me a minute and try again?",
    si: "Aiyo, දැන් ටිකක් busy — ටිකක් ඉස්සෙල්ලා try කරන්නකෝ 🙏",
    ta: "Aiyo, இப்போது கொஞ்சம் busy — ஒரு நிமிடம் கழித்து try செய்யுங்கள் 🙏",
  },
  stagnantFallback: {
    en: "Aiyo, I'm having a bit of trouble finding that right now — could you try rephrasing?",
    si: "Aiyo, ඒක හොයාගන්නේ ටිකක් problem — rephrasing කරලා try කරන්නකෝ.",
    ta: "Aiyo, அதை கண்டுபிடிக்க சிறு சிரமம் — வேறு விதமாக சொல்லி try செய்யுங்கள்.",
  },
  timeoutFallback: {
    en: "Aiyo, I ran out of time processing that. Can you try again?",
    si: "Aiyo, ටිකක් problem — නැවත try කරන්නකෝ.",
    ta: "Aiyo, சிறு பிரச்சனை — மீண்டும் try செய்யுங்கள்.",
  },
  troubleConnecting: {
    en: "I'm having a bit of trouble reaching Kapruka right now — please try again in a moment and I'll find real options for you.",
    si: "Kapruka connect කරන්නේ ටිකක් problem — ටිකක් ඉස්සෙල්ලා try කරන්නකෝ.",
    ta: "Kapruka இணைப்பில் சிறு பிரச்சனை — கொஞ்சம் நேரம் கழித்து மீண்டும் try செய்யுங்கள்.",
  },
  emptyGreeting: {
    en: "Hey! I'm Kira — your Kapruka shopping helper 🎁 Tell me what you're looking for: a gift, cakes, flowers, or something else?",
    si: "හෙලෝ! මම Kira — ඔබේ Kapruka shopping helper 🎁 Gift, cakes, flowers, නැතිනම් වෙන දෙයක් හොයනවාද?",
    ta: "வணக்கம்! நான் Kira — உங்கள் Kapruka shopping helper 🎁 Gift, cakes, flowers, அல்லது வேறு எதாவது தேடுகிறீர்களா?",
  },
  greetingQuick: {
    en: "Hey, I'm Kira. Who are we shopping for today?",
    si: "හෙලෝ, මම Kira. අද කාටද gift එකක් හොයන්නේ?",
    ta: "வணக்கம், நான் Kira. இன்று யாருக்காக gift பார்க்கலாம்?",
  },
  vagueAsk: {
    en: "Sweet. What kind of thing are you thinking — sweets, flowers, something useful, or something to wear?",
    si: "හරි. මොන වගේ දෙයක්ද හිතන්නේ — sweets, flowers, useful දෙයක්, නැතිනම් අඳින්න දෙයක්ද?",
    ta: "சரி. என்ன மாதிரி ஒன்று பார்க்கலாம் — sweets, flowers, useful item, அல்லது அணிய ஏதாவது?",
  },
  productRecipientAsk: {
    en: "Nice. Are these {category} for a birthday, get-well, anniversary, or just because? A city or budget helps me narrow it.",
    si: "හොඳයි. {category} birthday, get-well, anniversary, නැතිනම් just because ද? City එක හෝ budget එක දුන්නොත් narrow කරන්නම්.",
    ta: "சரி. இந்த {category} birthday, get-well, anniversary, அல்லது just because-க்கா? City அல்லது budget சொன்னால் narrow செய்கிறேன்.",
  },
  outOfScopeRedirect: {
    en: "Aiyo, that one's outside my shopping lane. I can help with Kapruka gifts, delivery, checkout, or order tracking.",
    si: "Aiyo, ඒක මගේ shopping lane එකෙන් පිට. Kapruka gifts, delivery, checkout, order tracking වලට මම help කරන්නම්.",
    ta: "Aiyo, அது என் shopping lane-க்கு வெளியே. Kapruka gifts, delivery, checkout, order tracking-க்கு நான் help செய்கிறேன்.",
  },
  mixedScriptAsk: {
    en: "I can help with that product, but the message is a bit mixed. Tell me the item, city, and budget in one line and I'll check Kapruka.",
    si: "Product එකට help කරන්නම්, message එක ටිකක් mixed. Item, city, budget එක line එකක කියන්නකෝ.",
    ta: "Product பார்க்க உதவுகிறேன், message கொஞ்சம் mixed. Item, city, budget-ஐ ஒரு line-இல் சொல்லுங்கள்.",
  },
  englishModeScriptAsk: {
    en: "I can help deliver there. What product should I search for on Kapruka — flowers, cake, chocolates, or a gift hamper?",
    si: "Delivery help කරන්නම්. Kapruka එකේ මොන product එකද search කරන්න — flowers, cake, chocolates, gift hamper?",
    ta: "அங்கே deliver செய்ய உதவுகிறேன். Kapruka-ல் எந்த product தேடலாம் — flowers, cake, chocolates, gift hamper?",
  },
  codPolicy: {
    en: "Kapruka payment happens on the secure checkout page. I can create the checkout link, then you can use the payment options Kapruka shows there.",
    si: "Kapruka payment secure checkout page එකේ වෙනවා. මම checkout link එක හදලා දෙන්නම්, එතැන Kapruka දෙන payment options use කරන්න.",
    ta: "Kapruka payment secure checkout page-இல் நடக்கும். நான் checkout link உருவாக்குகிறேன்; அங்கே Kapruka காட்டும் payment options பயன்படுத்தலாம்.",
  },
  deliveryPolicy: {
    en: "Same-day availability depends on the city and today's Kapruka slots. Tell me the city and product, and I'll check the live delivery option.",
    si: "Same-day delivery city එක සහ අද Kapruka slots මත depend වෙනවා. City එකත් product එකත් කියන්න, live delivery check කරන්නම්.",
    ta: "Same-day delivery city மற்றும் இன்றைய Kapruka slots மீது இருக்கும். City மற்றும் product சொல்லுங்கள்; live delivery பார்க்கிறேன்.",
  },
  jailbreakRedirect: {
    en: "Ha, I'm just Kira — one personality is plenty for me! Anything I can find for you on Kapruka? 🛍️",
    si: "හා, මම Kira විතරයි — එක personality ම ඇති! Kapruka ගෙන් මොකක්හරි හොයා දෙන්නද? 🛍️",
    ta: "ஹா, நான் Kira மட்டும்தான் — ஒரே personality போதும்! Kapruka-ல் ஏதாவது தேடி தரட்டுமா? 🛍️",
  },
  trustAffirmation: {
    en: "Absolutely — Kapruka has been Sri Lanka's biggest online gifting platform since 2010. Totally legit, secure payments, real delivery. Want to browse what's in stock? 🎁",
    si: "Bilkul — Kapruka 2010 ඉඳන් Sri Lanka's biggest online gifting platform. Totally legit, secure payments, real delivery. Stock check කරමුද? 🎁",
    ta: "நிச்சயமாக — Kapruka 2010 முதல் Sri Lanka-ன் மிகப்பெரிய online gifting platform. Totally legit, secure payments, real delivery. Stock பார்க்கலாமா? 🎁",
  },
  reorderSessionFound: {
    en: "Got it — same as last time! I'll use tomorrow's date unless you tell me otherwise. Here are your items again:",
    si: "හරි — පරණ order එකම! Date එක හෙට unless you say otherwise. Items ටික:",
    ta: "சரி — முந்தைய order மாதிரியே! Date நாளை unless you say otherwise. Items:",
  },
  reorderNoHistory: {
    en: "I don't have a previous order saved yet — place one first, or give me your Kapruka order number (e.g. KP-12345) and I'll pull it up. What would you like to send today?",
    si: "Previous order save නෑ — පළමු order එක place කරන්න, නැත්නම් order number (KP-12345) දෙන්න.",
    ta: "Previous order save இல்லை — முதலில் order place செய்யுங்கள், அல்லது order number (KP-12345) அனுப்புங்கள்.",
  },
  reorderFromRef: {
    en: "Pulled up order {orderNumber} — here's what was in it. Want the same delivery date or a new one?",
    si: "Order {orderNumber} pull කළා — items ටික මෙන්න. Same date ද new date ද?",
    ta: "Order {orderNumber} pull செய்தேன் — items இதோ. Same date-ஆ new date-ஆ?",
  },
  reorderRefNotFound: {
    en: "Couldn't rebuild that order from {orderNumber}. Double-check the number from your confirmation email.",
    si: "Order {orderNumber} rebuild කරන්න බෑ. Confirmation email number double-check කරන්න.",
    ta: "Order {orderNumber} rebuild செய்ய முடியவில்லை. Confirmation email number double-check செய்யுங்கள்.",
  },
  repairGiftAdvice: {
    en: "Machang, honestly? Flowers arriving at the door can feel like you're dodging the conversation. Pick them up yourself — hand-deliver with an apology. That's the real fix. Want me to find flowers you can collect, or something else entirely?",
    si: "Machang, honestly? Flowers door-to-door එන්නේ conversation avoid කරනවා වගේ. Pick up කරලා hand-deliver — apology එක්ක. ඒක real fix. Collect කරන්න flowers හොයමුද?",
    ta: "Machang, honestly? Flowers door-to-door வந்தால் conversation avoid பண்ணுற மாதிரி. Pick up பண்ணி hand-deliver — apology-ஓட. அதுதான் real fix. Collect flowers தேடலாமா?",
  },
  repairGiftAsk: {
    en: "Oof, sounds rough. What happened — and are you trying to fix it with a gift, or do you just need to talk it through first?",
    si: "Oof, rough වගේ. What happened — gift fix කරන්නද, නැත්නම් talk it through first?",
    ta: "Oof, rough மாதிரி. What happened — gift fix-க்கா, அல்லது talk it through first?",
  },
  rushSearchIntro: {
    en: "These can reach {city} on {date} — rush slots fill fast:",
    si: "These {city} {date} — rush slots fill fast:",
    ta: "These {city} {date} — rush slots fill fast:",
  },
  saleSearchIntro: {
    en: "Here are the most budget-friendly picks on Kapruka right now:",
    si: "Kapruka budget-friendly picks:",
    ta: "Kapruka budget-friendly picks:",
  },
  globalShopSoon: {
    en: "Global Shop (Amazon/eBay through Kapruka) is coming soon! For now I can search Kapruka's imported goods — want me to look?",
    si: "Global Shop coming soon! දැන් imported goods search කරන්නම්?",
    ta: "Global Shop coming soon! இப்போ imported goods search செய்யலாமா?",
  },
  postOrderSaved: {
    en: "Your order ref is {orderRef} — keep it for tracking or say 'order again'.",
    si: "ඔබේ order ref එක {orderRef} — track කරන්න තියාගන්න හෝ 'order again' කියන්න.",
    ta: "உங்கள் order ref {orderRef} — track பண்ண வச்சுக்கோங்க அல்லது 'order again' சொல்லுங்கள்.",
  },
  aboutProductInStock: {
    en: "Good pick to ask about! **{name}** — {price}{category}.{summary} It's in stock right now. Want it in your tray, or should I check delivery to your city first?",
    si: "හොඳ choice එකක්! **{name}** — {price}{category}.{summary} දැන් stock තියෙනවා. Tray එකට add කරන්නද, නැත්නම් delivery check කරන්නද?",
    ta: "நல்ல choice! **{name}** — {price}{category}.{summary} இப்போது stock-இல் உள்ளது. Tray-இல் சேர்க்கலாமா, அல்லது delivery பார்க்கலாமா?",
  },
  aboutProductOutOfStock: {
    en: "**{name}** — {price}{category}.{summary} It's out of stock at the moment though — want me to find something similar?",
    si: "**{name}** — {price}{category}.{summary} දැන් stock නෑ — similar දෙයක් හොයලා දෙන්නද?",
    ta: "**{name}** — {price}{category}.{summary} இப்போது stock இல்லை — similar ஒன்று தேடட்டுமா?",
  },
};

function L(key: string, lang: string): string {
  const map = LS[key];
  if (!map) return key;
  return map[lang] ?? map.en ?? key;
}

function Lf(key: string, lang: string, vars: Record<string, string | number>): string {
  let str = L(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

// Cache the MCP tool list across requests (schemas rarely change).
let mcpToolsCache:
  | { tools: Awaited<ReturnType<typeof listMcpTools>>; ts: number }
  | null = null;
const MCP_TOOLS_TTL_MS = 5 * 60 * 1000;

const enc = new TextEncoder();
function sse(t: string, v?: unknown): Uint8Array {
  return enc.encode(
    `data: ${JSON.stringify(v !== undefined ? { t, v } : { t })}\n\n`
  );
}

const CATALOG_GUARD_INTENT_RE =
  /\b(show|search|find|browse|buy|get|send|order|recommend|gift|present|cake|flower|rose|bouquet|chocolat|hamper|toy|fashion|cloth|dress|saree|electronic|phone|perfume|jewel|delivery|checkout|cart|tray|budget|under|below|max|price|lkr|rs\.?)\b/i;
const CURRENCY_AMOUNT_RE = /\b(?:LKR|Rs\.?|රු)\s*([\d,]+(?:\.\d+)?)/gi;
const BUDGET_CONTEXT_AMOUNT_RE =
  /\b(?:under|below|max(?:imum)?|budget|less than|up to)\s*(?:lkr|rs\.?)?\s*([\d,]+(?:\.\d+)?)/i;

function parseBudgetAmount(value?: string): number | undefined {
  if (!value) return undefined;
  const match =
    value.match(BUDGET_CONTEXT_AMOUNT_RE) ??
    value.match(/\b(?:lkr|rs\.?)\s*([\d,]+(?:\.\d+)?)/i) ??
    value.match(/\b([\d,]{3,}(?:\.\d+)?)\b/);
  const amount = match ? Number(match[1].replace(/,/g, "")) : undefined;
  return amount && Number.isFinite(amount) && amount > 0 ? Math.round(amount) : undefined;
}

function extractCurrencyAmounts(text: string): number[] {
  const amounts: number[] = [];
  for (const match of text.matchAll(CURRENCY_AMOUNT_RE)) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) amounts.push(Math.round(amount));
  }
  return amounts;
}

function isBudgetPhraseAroundAmount(text: string, amount: number): boolean {
  const escaped = amount.toLocaleString("en-LK").replace(/,/g, "\\s*,?\\s*");
  const plain = String(amount).split("").join("\\s*,?\\s*");
  const amountPattern = `(?:${escaped}|${plain})`;
  const budgetNear = new RegExp(
    `(?:under|below|max(?:imum)?|budget|less than|up to|ceiling).{0,24}(?:LKR|Rs\\.?)?\\s*${amountPattern}|` +
      `(?:LKR|Rs\\.?)?\\s*${amountPattern}.{0,24}(?:budget|limit|ceiling)`,
    "i"
  );
  return budgetNear.test(text);
}

function shouldGuardCatalogText(
  latestUserText: string,
  toolsCalled: Set<string>
): boolean {
  return (
    CATALOG_GUARD_INTENT_RE.test(latestUserText) ||
    toolsCalled.has("kapruka_search_products") ||
    toolsCalled.has("kapruka_get_product") ||
    toolsCalled.has("kapruka_check_delivery") ||
    toolsCalled.has("kapruka_create_order")
  );
}

function safeCatalogAmounts({
  products,
  deliveryQuotes,
  checkoutInfo,
  latestUserText,
  budget,
}: {
  products: KiraProduct[];
  deliveryQuotes: DeliveryQuote[];
  checkoutInfo?: CheckoutInfo;
  latestUserText: string;
  budget?: string;
}): Set<number> {
  const safe = new Set<number>();
  for (const product of products) safe.add(Math.round(product.price));
  for (const quote of deliveryQuotes) {
    if (quote.fee !== undefined) safe.add(Math.round(quote.fee));
  }
  const summary = checkoutInfo?.summary;
  for (const amount of [
    summary?.itemsTotal,
    summary?.deliveryFee,
    summary?.addonsTotal,
    summary?.grandTotal,
    parseBudgetAmount(latestUserText),
    parseBudgetAmount(budget),
  ]) {
    if (amount !== undefined && Number.isFinite(amount)) safe.add(Math.round(amount));
  }
  return safe;
}

function isUnsafeCatalogClaim({
  text,
  products,
  deliveryQuotes,
  checkoutInfo,
  latestUserText,
  budget,
}: {
  text: string;
  products: KiraProduct[];
  deliveryQuotes: DeliveryQuote[];
  checkoutInfo?: CheckoutInfo;
  latestUserText: string;
  budget?: string;
}): boolean {
  if (!text.trim()) return false;
  if (/₹/.test(text)) return true;

  const amounts = extractCurrencyAmounts(text);
  if (amounts.length > 0) {
    const safe = safeCatalogAmounts({
      products,
      deliveryQuotes,
      checkoutInfo,
      latestUserText,
      budget,
    });
    for (const amount of amounts) {
      if (safe.has(amount)) continue;
      if (isBudgetPhraseAroundAmount(text, amount)) continue;
      return true;
    }
  }

  const hasRealCatalogFact =
    products.length > 0 || deliveryQuotes.length > 0 || checkoutInfo !== undefined;
  const repeatedListingShape =
    /\b(?:\d+[\).]|[-•])\s*[A-Z][^\n]{8,80}?(?:LKR|Rs\.?|priced|costs?|at)\b[\s\S]*\b(?:\d+[\).]|[-•])\s*[A-Z][^\n]{8,80}?(?:LKR|Rs\.?|priced|costs?|at)\b/i.test(
      text
    );
  return !hasRealCatalogFact && repeatedListingShape;
}

function stripKnownProductNames(text: string, products: KiraProduct[]): string {
  let stripped = text;
  for (const product of products) {
    const name = product.name?.trim();
    if (!name) continue;
    stripped = stripped.split(name).join("");
  }
  return stripped;
}

const TOOL_STEPS: Record<string, string> = {
  kapruka_search_products: "Searching Kapruka catalog",
  kapruka_list_categories: "Browsing categories",
  kapruka_check_delivery: "Checking delivery availability",
  kapruka_get_product: "Getting product details",
  kapruka_create_order: "Placing your order",
  kapruka_list_delivery_cities: "Resolving delivery city",
  kapruka_track_order: "Tracking your order",
};

export async function POST(req: NextRequest) {
  const body: ChatRequest = await req.json();
  const sandboxCheckout = isSandboxCheckout(req);

  const stream = new ReadableStream({
    async start(controller) {
      let mcpClient: Awaited<ReturnType<typeof getMcpClient>> | undefined;
      // Per-request delivery cache — keyed by city|date|product to avoid
      // cross-contaminating date-specific quotes across calls.
      const deliveryCacheStore = new Map<string, unknown>();

      try {
        const {
          messages,
          cart,
          deliveryCity,
          deliveryDate,
          budget,
          occasion,
          recipient,
          lastProducts,
          lastOrder,
        } = body;
        const language: string = body.language ?? "en";
        const latestUserText =
          [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

        const cartContext =
          cart.length > 0
            ? `\n\nCurrent cart: ${cart.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}`
            : "";
        // Products the client is currently showing as cards. Some come from the
        // storefront catalog (Neon), which is separate from the live Kapruka MCP —
        // searching MCP for those names returns nothing. Give the model the data
        // so it can answer instead of reporting "not found". Only added when
        // lastProducts is non-empty, so the prompt-length cost is conditional.
        const lastProductsContext =
          lastProducts && lastProducts.length > 0
            ? `\n\nProducts currently shown to the user as cards:\n` +
              lastProducts
                .slice(0, 6)
                .map(
                  (p) =>
                    `- ${p.name} — LKR ${p.price.toLocaleString("en-LK")}${
                      p.category ? ` (${p.category})` : ""
                    }${p.inStock === false ? " — OUT OF STOCK" : ""}${
                      p.summary ? `: ${p.summary.replace(/\s+/g, " ").slice(0, 100)}` : ""
                    }`
                )
                .join("\n") +
              `\nIf the user asks about one of these, answer from this data. Some are storefront items missing from kapruka_search_products/kapruka_get_product — if a tool lookup finds nothing for one of them, describe it from the data above instead of saying it can't be found.`
            : "";
        const deliveryContext = deliveryCity
          ? `\nDelivery city: ${deliveryCity} (already confirmed — do not call check_delivery again for this city unless a product or date is now available)`
          : "";
        const deliveryDateContext = deliveryDate
          ? `\nRequested delivery date: ${deliveryDate} — always pass this date as delivery_date when calling kapruka_check_delivery and kapruka_create_order.`
          : "";
        const budgetContext = budget
          ? `\nBudget context: ${budget}${
              parseBudgetAmount(budget)
                ? ` — use max_price:${parseBudgetAmount(budget)} for product searches unless the user overrides it.`
                : ""
            }`
          : "";
        const occasionContext = occasion
          ? `\nOccasion context: ${occasion} — use this to choose and explain fitting products.`
          : "";
        const recipientContext = recipient
          ? `\nRecipient context: ${recipient} — use this to choose and explain fitting products.`
          : "";

        const internationalContext = body.internationalMode
          ? "\n\nSender is overseas — quote LKR prices and approximate USD (LKR 300 ≈ USD 1). Reassure: Kapruka delivers islandwide; need recipient's Sri Lanka address."
          : "";

        mcpClient = await getMcpClient();
        if (
          await tryHandleDeterministicPrompt({
            text: latestUserText,
            messages,
            cart,
            deliveryCity,
            deliveryDate,
            lastProducts,
            lastOrder,
            language,
            mcpClient,
            controller,
            budget,
            occasion,
            recipient,
            internationalMode: body.internationalMode,
          })
        ) {
          controller.close();
          return;
        }

        let mcpTools: Awaited<ReturnType<typeof listMcpTools>>;
        if (mcpToolsCache && Date.now() - mcpToolsCache.ts < MCP_TOOLS_TTL_MS) {
          mcpTools = mcpToolsCache.tools;
        } else {
          mcpTools = await listMcpTools(mcpClient);
          mcpToolsCache = { tools: mcpTools, ts: Date.now() };
        }

        const trimDesc = (desc: string) =>
          desc.split(/\n/)[0].split(". ")[0].slice(0, 120);

        function relaxSchema(
          schema: Record<string, unknown>
        ): Record<string, unknown> {
          const props = schema.properties as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (!props) return schema;
          const relaxed = Object.fromEntries(
            Object.entries(props).map(([k, v]) => {
              // Strip enum constraints on strings — the model may pass valid-but-unlisted
              // values (e.g. sort:"popular") that cause Groq 400 schema rejections.
              if (v.type === "string" && v.enum) {
                const rest = { ...v };
                delete rest.enum;
                return [k, rest];
              }
              if (v.type === "integer" || v.type === "number") {
                const rest = { ...v };
                delete rest.type;
                return [k, { ...rest, anyOf: [{ type: v.type }, { type: "string" }] }];
              }
              if (v.anyOf && Array.isArray(v.anyOf)) {
                const arr = v.anyOf as Record<string, unknown>[];
                const hasNumeric = arr.some(
                  (s) => s.type === "number" || s.type === "integer"
                );
                if (hasNumeric)
                  return [k, { ...v, anyOf: [...arr, { type: "string" }] }];
              }
              if (v.type === "array" || v.type === "object") {
                const rest = { ...v };
                delete rest.type;
                return [k, { ...rest, anyOf: [{ type: v.type }, { type: "string" }] }];
              }
              if (v.type === "boolean") {
                const rest = { ...v };
                delete rest.type;
                return [k, { ...rest, anyOf: [{ type: "boolean" }, { type: "string" }] }];
              }
              return [k, v];
            })
          );
          const defs = schema.$defs as
            | Record<string, Record<string, unknown>>
            | undefined;
          const relaxedDefs = defs
            ? Object.fromEntries(
                Object.entries(defs).map(([k, v]) => [k, relaxSchema(v)])
              )
            : undefined;
          return {
            ...schema,
            properties: relaxed,
            ...(relaxedDefs ? { $defs: relaxedDefs } : {}),
          };
        }

        function resolveSchema(rawSchema: Record<string, unknown>): {
          schema: Record<string, unknown>;
          needsParamsWrap: boolean;
        } {
          const props = rawSchema.properties as Record<string, unknown> | undefined;
          const required = rawSchema.required as string[] | undefined;
          const defs = rawSchema.$defs as Record<string, unknown> | undefined;
          if (
            props &&
            required?.length === 1 &&
            required[0] === "params" &&
            props.params
          ) {
            const paramsEntry = props.params as Record<string, unknown>;
            const ref = paramsEntry.$ref as string | undefined;
            if (ref && defs) {
              const refName = ref.split("/").pop()!;
              const inner = defs[refName] as Record<string, unknown> | undefined;
              if (inner) {
                return { schema: { ...inner, $defs: defs }, needsParamsWrap: true };
              }
            }
          }
          return { schema: rawSchema, needsParamsWrap: false };
        }

        const toolMeta: { needsParamsWrap: boolean }[] = [];
        const tools: Groq.Chat.Completions.ChatCompletionTool[] = mcpTools.map(
          (tool) => {
            const raw = (tool.inputSchema as Record<string, unknown>) ?? {
              type: "object",
              properties: {},
            };
            const { schema, needsParamsWrap } = resolveSchema(raw);
            toolMeta.push({ needsParamsWrap });
            return {
              type: "function",
              function: {
                name: tool.name,
                description: trimDesc(tool.description ?? ""),
                parameters: relaxSchema(schema),
              },
            };
          }
        );

        type GroqMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

        // Context compaction: keep a verbatim sliding window of recent turns and
        // prepend a structural summary of older turns so Kira retains cross-turn
        // memory (budget, city, occasion, shown products) without bloating context.
        const HISTORY_WINDOW = 8;   // recent turns always kept verbatim
        const COMPACT_THRESHOLD = 12; // compact when history exceeds this
        const recentMessages = messages.slice(-HISTORY_WINDOW);
        const olderMessages =
          messages.length > COMPACT_THRESHOLD
            ? messages.slice(0, -HISTORY_WINDOW)
            : [];
        const compactSummary =
          olderMessages.length > 0 ? buildCompactSummary(olderMessages) : "";

        // Explicit language instruction — no guessing needed.
        // The user's selector controls response language only; Kira always
        // understands input in any script (Sinhala Unicode, Romanized Sinhala,
        // Tanglish, English). Fallback models ignore script-detection heuristics
        // and hallucinate garbled Sinhala, so we lock the output language here.
        const langInstruction =
          language === "si"
            ? "\n\nIMPORTANT — LANGUAGE: You MUST respond entirely in Sinhala script (Unicode, U+0D80–U+0DFF). Every word of your response must be written in Sinhala Unicode characters. Do NOT use Latin script, Romanized Sinhala, or English in your response. You can understand input in any language or script — only your RESPONSES must be in Sinhala Unicode."
            : language === "ta"
            ? "\n\nIMPORTANT — LANGUAGE: You MUST respond primarily in Tamil script (Unicode, U+0B80–U+0BFF). Tamil Unicode characters must appear in every response — do not respond in pure English. For product names or individual words you cannot write in Tamil, you may include the English word; but frame the sentence in Tamil. NEVER use Sinhala Unicode (U+0D80–U+0DFF) — Sinhala and Tamil are completely different scripts. Example of acceptable format: 'Kapruka-இல் 3 options — stock-இல் உள்ளவை.'"
            : "\n\nIMPORTANT — LANGUAGE: You MUST respond in English or Tanglish. Tanglish means casual English mixed with ROMANIZED Sinhala/Tamil words only (e.g. 'aiyo', 'machang', 'amma', 'podi', 'nona'). Do not write Sinhala Unicode (U+0D80–U+0DFF) or Tamil Unicode (U+0B80–U+0BFF) in your own prose, even if the user writes in those scripts. Exception: exact Kapruka product names returned by tools may remain in their original Sinhala/Tamil Unicode script. The selected language mode OVERRIDES the input script.";

        // Authoritative per-request date. KIRA_SYSTEM_PROMPT bakes `new Date()` at
        // module-load time, which goes stale after a cold start; this line is
        // evaluated on every request and overrides it for delivery-date logic.
        const todayIso = getColomboTodayIso();
        const tomorrowIso = getColomboTomorrowIso();
        const dateContext =
          `\n\n[CURRENT DATE: ${todayIso} — treat this as today for ALL delivery-date logic. ` +
          `Delivery date must be today or later; if the user gives no date, default to tomorrow (${tomorrowIso}) and confirm.]`;

        const systemContent =
          KIRA_SYSTEM_PROMPT +
          cartContext +
          lastProductsContext +
          deliveryContext +
          deliveryDateContext +
          budgetContext +
          occasionContext +
          recipientContext +
          dateContext +
          internationalContext +
          langInstruction +
          (compactSummary ? `\n\n${compactSummary}` : "");

        const mappedRecent = recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // EN mode: always prepend a hard script lock on the latest user message.
        // The lock is ~15 tokens and prevents the model from code-switching to Sinhala/Tamil
        // Unicode when it recognises cultural keywords (Vesak, amma, avurudu, etc.).
        // Without this, Llama infers a "Sinhala-speaker context" from topic words alone and
        // replies in Unicode even when the system prompt says otherwise.
        if (language === "en") {
          const lastIdx = mappedRecent.length - 1;
          if (lastIdx >= 0 && mappedRecent[lastIdx].role === "user") {
            mappedRecent[lastIdx] = {
              ...mappedRecent[lastIdx],
              content: "[RESPOND IN ENGLISH/TANGLISH PROSE ONLY — EXACT KAPRUKA PRODUCT NAMES MAY KEEP ORIGINAL SCRIPT]\n" + mappedRecent[lastIdx].content,
            };
          }
        }

        let currentMessages: GroqMessage[] = [
          { role: "system", content: systemContent },
          ...mappedRecent,
        ];

        let finalText = "";
        const collectedProducts: KiraProduct[] = [];
        const collectedDeliveryQuotes: DeliveryQuote[] = [];
        let checkoutInfo: CheckoutInfo | undefined;
        // Recipient / delivery / gift-message captured from the create_order call so the
        // lastOrder snapshot can pre-fill a reorder, not just re-show the items.
        let lastOrderArgs:
          | Partial<Pick<LastOrder, "recipient" | "delivery" | "giftMessage">>
          | undefined;
        let payLink: string | undefined;
        let modelIndex = 0;
        let hallucinationRetries = 0; // circuit breaker — stop-hook fires at most once
        let stagnantRounds = 0;       // consecutive tool-use rounds with no progress
        let streamedText = false;     // true once real streaming emits the first token
        // Track which tools ran this request so stagnation doesn't misfire
        // during checkout flows (list_delivery_cities + check_delivery + create_order
        // are all meaningful progress even though they collect no products).
        const toolsCalledThisRequest = new Set<string>();
        // Query chain tracking — chainId spans the full request, depth = round index.
        // Logged server-side; emitted as a no-op "chain" SSE the client ignores.
        const chainId = Math.random().toString(36).slice(2, 10);

        const JSON_FORMAT_TOOLS = [
          "kapruka_search_products",
          "kapruka_list_categories",
          "kapruka_check_delivery",
          "kapruka_get_product",
          "kapruka_create_order",
          "kapruka_list_delivery_cities",
          "kapruka_track_order",
        ];

        async function executeToolCalls(
          calls: Groq.Chat.Completions.ChatCompletionMessageToolCall[]
        ) {
          // Parse args and emit all step labels upfront so the UI shows what's
          // happening before any awaits block. This also lets the user see when
          // multiple tools are running in parallel.
          const parsedCalls = calls.map((toolCall) => {
            const toolName = toolCall.function.name;
            let toolArgs: Record<string, unknown> = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            } catch { /* malformed args */ }

            let stepLabel = TOOL_STEPS[toolName] ?? "Using a tool";
            if (toolName === "kapruka_search_products") {
              const q = String(toolArgs.q ?? "").trim();
              if (q) stepLabel = `Searching Kapruka for "${q}"`;
            }
            controller.enqueue(sse("step", stepLabel));

            if (toolName === "kapruka_search_products") {
              const maxPrice = toolArgs.max_price ?? toolArgs.maxPrice;
              if (maxPrice != null) {
                const num = Number(maxPrice);
                if (!isNaN(num) && num > 0)
                  controller.enqueue(
                    sse("context", { budget: `Under LKR ${num.toLocaleString("en-LK")}` })
                  );
              }
            }

            return { toolCall, toolName, toolArgs };
          });

          // Single-tool executor — shared by both the safe (parallel) and
          // exclusive (sequential) paths below.
          type ParsedCall = { toolCall: Groq.Chat.Completions.ChatCompletionMessageToolCall; toolName: string; toolArgs: Record<string, unknown> };
          async function executeSingleTool({ toolCall, toolName, toolArgs: rawArgs }: ParsedCall) {
            const asRecord = (v: unknown): Record<string, unknown> | undefined =>
              v && typeof v === "object" && !Array.isArray(v)
                ? (v as Record<string, unknown>)
                : undefined;
            let toolArgs = { ...rawArgs };

            // Some models still emit MCP-style `{ params: {...} }` even though we
            // flatten the schema for Groq. Merge the inner params up so create_order
            // never becomes params.params — merging (not replacing) preserves any
            // sibling fields the model left at the top level in a partial wrap.
            if (toolName === "kapruka_create_order") {
              const wrapped = asRecord(toolArgs.params);
              if (wrapped) {
                toolArgs = { ...toolArgs, ...wrapped };
                delete toolArgs.params;
              }
            }

            if (JSON_FORMAT_TOOLS.includes(toolName)) {
              toolArgs = { ...toolArgs, response_format: "json" };
            }

            // Correct common misspellings in search queries before hitting MCP.
            if (toolName === "kapruka_search_products" && toolArgs.q) {
              const corrected = String(toolArgs.q)
                .toLowerCase()
                .split(/\s+/)
                .map((w) => SEARCH_SPELLING_MAP[w] ?? w)
                .join(" ");
              toolArgs = { ...toolArgs, q: corrected };
            }

            const toolIndex = mcpTools.findIndex((t) => t.name === toolName);
            const flatSchema =
              toolIndex >= 0
                ? (tools[toolIndex]?.function?.parameters as Record<string, unknown>)
                : null;
            if (flatSchema) toolArgs = coerceArgTypes(toolArgs, flatSchema);

            const needsWrap = toolIndex >= 0 && toolMeta[toolIndex]?.needsParamsWrap;
            const mcpArgs = needsWrap ? { params: toolArgs } : toolArgs;

            toolsCalledThisRequest.add(toolName);
            let resultContent: unknown;
            try {
              if (toolName === "kapruka_create_order" && sandboxCheckout) {
                checkoutInfo = buildSandboxCheckoutInfo(cart);
                payLink = checkoutInfo.checkoutUrl;
                const clean = (v: unknown): string | undefined => {
                  const s = typeof v === "string" ? v.trim() : "";
                  return s ? s : undefined;
                };
                const rec = asRecord(toolArgs.recipient);
                const del = asRecord(toolArgs.delivery);
                const recipientName = clean(rec?.name);
                const recipientPhone = clean(rec?.phone);
                const deliveryCityValue = clean(del?.city);
                const deliveryAddress = clean(del?.address);
                const giftMessage = clean(toolArgs.gift_message ?? toolArgs.giftMessage);
                lastOrderArgs = {
                  recipient: recipientName && recipientPhone
                    ? { name: recipientName, phone: recipientPhone }
                    : undefined,
                  delivery: deliveryCityValue && deliveryAddress
                    ? { city: deliveryCityValue, address: deliveryAddress }
                    : undefined,
                  giftMessage,
                };
                resultContent = [
                  {
                    type: "text",
                    text: JSON.stringify({
                      checkout_url: checkoutInfo.checkoutUrl,
                      order_ref: checkoutInfo.orderRef,
                      mode: "sandbox",
                    }),
                  },
                ];
              } else if (toolName === "kapruka_check_delivery") {
                const city = String(toolArgs.city ?? "").toLowerCase().trim();
                const date = String(toolArgs.delivery_date ?? "").trim();
                const product = String(toolArgs.product_id ?? "").trim();
                const cacheKey = `${city}|${date}|${product}`;
                if (city && deliveryCacheStore.has(cacheKey)) {
                  resultContent = deliveryCacheStore.get(cacheKey);
                } else {
                  const toolResult = await callMcpTool(mcpClient!, toolName, mcpArgs);
                  resultContent = toolResult.content;
                  if (city) deliveryCacheStore.set(cacheKey, toolResult.content);
                }
              } else {
                const toolResult = await callMcpTool(mcpClient!, toolName, mcpArgs);
                resultContent = toolResult.content;
              }
            } catch (mcpErr) {
              const msg = mcpErr instanceof Error ? mcpErr.message : String(mcpErr);
              // Connection errors invalidate the singleton so the next request reconnects.
              if (/connection|not connected|transport|closed|econnreset|socket|session not found/i.test(msg)) {
                invalidateMcpClient();
              }
              resultContent = [{ type: "text", text: `Tool error: ${msg}` }];
            }

            // Emit SSE side-effects as each tool completes.
            const resultText = formatMcpContentForModel(resultContent);

            if (toolName === "kapruka_check_delivery") {
              const deliveryInfo = extractDeliveryInfoFromMcp(resultContent);
              if (deliveryInfo) {
                collectedDeliveryQuotes.push(deliveryInfo);
                controller.enqueue(sse("delivery", deliveryInfo));
              }
            }
            if (toolName === "kapruka_search_products" || toolName === "kapruka_list_categories") {
              const rawForLlm = extractProductsFromMcp(resultContent);
              const queryKey = String(toolArgs.q ?? "").toLowerCase().trim();
              const relFilter = CATEGORY_RELEVANCE_TERMS[queryKey];
              const irrelFilter = CATEGORY_IRRELEVANCE_TERMS[queryKey];
              const filteredForLlm = relFilter
                ? rawForLlm.filter((p) => {
                    const txt = `${p.name} ${p.category ?? ""}`;
                    return relFilter.test(txt) && !(irrelFilter?.test(txt));
                  })
                : rawForLlm;
              collectedProducts.push(...(filteredForLlm.length > 0 ? filteredForLlm : rawForLlm));
            }
            if (toolName === "kapruka_create_order") {
              if (!sandboxCheckout) {
                checkoutInfo = extractCheckoutInfoFromMcp(resultContent);
                payLink = checkoutInfo?.checkoutUrl;
              }
              // Snapshot the recipient/delivery/gift details the model collected so a
              // later "order again" can pre-fill them.
              const clean = (v: unknown): string | undefined => {
                const s = typeof v === "string" ? v.trim() : "";
                return s ? s : undefined;
              };
              const rec = asRecord(toolArgs.recipient);
              const del = asRecord(toolArgs.delivery);
              const recipientName = clean(rec?.name);
              const recipientPhone = clean(rec?.phone);
              const deliveryCityValue = clean(del?.city);
              const deliveryAddress = clean(del?.address);
              const giftMessage = clean(toolArgs.gift_message ?? toolArgs.giftMessage);
              lastOrderArgs = {
                recipient: recipientName && recipientPhone
                  ? { name: recipientName, phone: recipientPhone }
                  : undefined,
                delivery: deliveryCityValue && deliveryAddress
                  ? { city: deliveryCityValue, address: deliveryAddress }
                  : undefined,
                giftMessage,
              };
            }
            if (toolName === "kapruka_track_order") {
              const tracking = extractTrackingFromMcp(resultContent);
              if (tracking) controller.enqueue(sse("tracking", tracking));
            }

            return { toolCall, toolName, resultText };
          }

          // Concurrency-classified execution:
          // - Safe (read-only) tools run in parallel via Promise.all
          // - Exclusive tools (create_order) run sequentially after, never overlapping
          // Results are merged back into original call order for currentMessages.
          const safeCalls = parsedCalls.filter((c) => CONCURRENT_SAFE_TOOLS.has(c.toolName));
          const exclusiveCalls = parsedCalls.filter((c) => !CONCURRENT_SAFE_TOOLS.has(c.toolName));

          // Fire summary generation concurrently with tool execution — 8B model
          // resolves in ~0.5s, well within the tool call latency window.
          const summaryPromise = generateToolSummary(parsedCalls.map((c) => c.toolName));

          const safeResults = await Promise.all(safeCalls.map(executeSingleTool));
          const exclusiveResults: typeof safeResults = [];
          for (const call of exclusiveCalls) {
            exclusiveResults.push(await executeSingleTool(call));
          }

          // Merge in original call order (required by Groq's tool_result ordering).
          const byId = new Map(
            [...safeResults, ...exclusiveResults].map((r) => [r.toolCall.id, r]),
          );
          const results = parsedCalls.map((c) => byId.get(c.toolCall.id)!);

          // Emit the summary — should already be resolved since tool calls take longer.
          const summary = await summaryPromise;
          if (summary) controller.enqueue(sse("stepSummary", summary));

          // Push tool results to currentMessages in original call order.
          // truncateForModel strips non-essential fields so the model receives
          // a lean payload while SSE side-effects (above) used the full content.
          for (const { toolCall, toolName, resultText } of results) {
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: truncateForModel(toolName, resultText),
            });
          }
        }

        // Agentic loop — uses Groq streaming so text tokens reach the client in real-time.
        // Tool-call deltas are buffered and reconstructed into the same ChatCompletion
        // shape so all post-loop logic (failed_generation recovery, hallucination hook,
        // context trim, etc.) works unchanged.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let response: Groq.Chat.Completions.ChatCompletion | undefined;

          // Emit "Thinking…" on the first call so the user sees immediate feedback.
          // Subsequent rounds are already explained by the tool-step labels above.
          if (round === 0) {
            controller.enqueue(sse("step", "Thinking…"));
          }

          // ── Model call with clean fallback ──────────────────────────────────
          // Inner loop retries with the next model on 429/413 WITHOUT consuming
          // a round slot — replaces the old `round--` hack. Labels let us break
          // or continue both loops independently.
          let rateExhausted = false;
          let failedGenHandled = false;
          let responseHadUnsafeBufferedText = false;

          callLoop: while (true) {
            const isLastModel = modelIndex === MODELS.length - 1;
            const reqTools = !isLastModel && tools.length > 0 ? tools : undefined;
            const reqMessages = isLastModel
              ? [
                  {
                    ...currentMessages[0],
                    content:
                      (currentMessages[0].content as string) +
                      "\n\nIMPORTANT: You currently have NO access to the Kapruka catalog. Do NOT invent, list, or describe any products, prices, or availability. Instead tell the user you're having trouble connecting to Kapruka right now and ask them to try again in a moment.",
                  },
                  ...currentMessages.slice(1),
                ]
              : currentMessages;

            try {
              // ── Streaming call ─────────────────────────────────────────────
              // Text tokens are emitted to SSE as they arrive.
              // Tool-call deltas are buffered then reconstructed into the same
              // ChatCompletion shape so all downstream logic stays unchanged.
              let sContent = "";
              const sToolMap = new Map<number, { id: string; name: string; args: string }>();
              let sFinish = "";
              let sUsage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
              const guardText = shouldGuardCatalogText(latestUserText, toolsCalledThisRequest);
              // Guarded shopping/catalog turns buffer the whole text response until
              // the stream completes, so post-tool hallucinated product/price claims
              // can still be rejected instead of leaking after a short lookahead.
              const pendingBuf: string[] = [];

              const groqStream = await getGroq().chat.completions.create({
                model: MODELS[modelIndex],
                messages: reqMessages,
                tools: reqTools,
                tool_choice: reqTools ? ("auto" as const) : undefined,
                max_tokens: 1024,
                stream: true,
              });

              for await (const chunk of groqStream) {
                const chunkAny = chunk as { usage?: typeof sUsage };
                if (chunkAny.usage) sUsage = chunkAny.usage;
                const sChoice = chunk.choices[0];
                if (!sChoice) continue;
                if (sChoice.finish_reason) sFinish = sChoice.finish_reason;
                const delta = sChoice.delta as {
                  content?: string | null;
                  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
                };
                if (delta.content) {
                  sContent += delta.content;
                  if (guardText) {
                    pendingBuf.push(delta.content);
                  } else if (!streamedText) {
                    controller.enqueue(sse("token", delta.content));
                    streamedText = true;
                  } else {
                    controller.enqueue(sse("token", delta.content));
                  }
                }
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!sToolMap.has(tc.index)) sToolMap.set(tc.index, { id: "", name: "", args: "" });
                    const entry = sToolMap.get(tc.index)!;
                    if (tc.id) entry.id = tc.id;
                    if (tc.function?.name) entry.name += tc.function.name;
                    if (tc.function?.arguments) entry.args += tc.function.arguments;
                  }
                }
              }

              // Flush guarded response text only after the completed response
              // validates against live products/delivery/checkout facts.
              if (pendingBuf.length > 0) {
                const unsafe = isUnsafeCatalogClaim({
                  text: sContent,
                  products: collectedProducts,
                  deliveryQuotes: collectedDeliveryQuotes,
                  checkoutInfo,
                  latestUserText,
                  budget,
                });
                if (unsafe) {
                  responseHadUnsafeBufferedText = true;
                } else {
                  for (const t of pendingBuf) controller.enqueue(sse("token", t));
                  pendingBuf.length = 0;
                  streamedText = true;
                }
              }

              const sToolCalls = sToolMap.size > 0
                ? Array.from(sToolMap.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([, tc]) => ({
                      id: tc.id,
                      type: "function" as const,
                      function: { name: tc.name, arguments: tc.args },
                    }))
                : undefined;

              // Reconstruct ChatCompletion shape so post-loop code works unchanged.
              response = {
                choices: [{
                  finish_reason: (sFinish || "stop") as "stop" | "length" | "tool_calls" | "content_filter",
                  message: { role: "assistant", content: sContent || null, tool_calls: sToolCalls },
                  index: 0,
                  logprobs: null,
                }],
                usage: sUsage as Groq.Chat.Completions.ChatCompletion["usage"],
                id: "",
                model: MODELS[modelIndex],
                object: "chat.completion",
                created: 0,
              } as Groq.Chat.Completions.ChatCompletion;

              break callLoop; // success — exit inner loop
            } catch (err) {
              type ErrBody = { code?: string; failed_generation?: string; message?: string };
              const apiErr = err as {
                status?: number;
                error?: ErrBody & { error?: ErrBody };
              };
              const inner: ErrBody = apiErr?.error?.error ?? apiErr?.error ?? {};

              // Groq returns 400 with code "context_length_exceeded" or similar for overlong prompts.
              if (
                apiErr?.status === 400 &&
                (inner.code === "context_length_exceeded" ||
                  inner.message?.toLowerCase().includes("prompt_too_long") ||
                  inner.message?.toLowerCase().includes("context length"))
              ) {
                if (currentMessages.length > 5) {
                  currentMessages = [currentMessages[0], ...currentMessages.slice(-4)];
                  continue callLoop;
                }
              }

              if (apiErr?.status === 413) {
                // Context too long — compact to system + last 4 messages and retry once.
                if (currentMessages.length > 5) {
                  currentMessages = [currentMessages[0], ...currentMessages.slice(-4)];
                  continue callLoop;
                }
              }

              if (apiErr?.status === 429 || apiErr?.status === 413) {
                if (modelIndex < MODELS.length - 1) {
                  modelIndex++;
                  continue callLoop; // retry same round with next model
                }
                finalText = L("rateExhausted", language);
                rateExhausted = true;
                break callLoop;
              }

              if (
                apiErr?.status === 400 &&
                inner.code === "tool_use_failed" &&
                inner.failed_generation
              ) {
                type RawCall = {
                  name: string;
                  parameters?: Record<string, unknown>;
                };
                let rawCalls: RawCall[] = [];
                try {
                  rawCalls = JSON.parse(inner.failed_generation) as RawCall[];
                } catch {
                  const match = inner.failed_generation.match(/\[[\s\S]*\]/);
                  if (match) {
                    try {
                      rawCalls = JSON.parse(match[0]) as RawCall[];
                    } catch { /* unparseable */ }
                  }
                }
                if (rawCalls.length > 0) {
                  const fakeCalls: Groq.Chat.Completions.ChatCompletionMessageToolCall[] =
                    rawCalls.map((rc, i) => ({
                      id: `coerced-${round}-${i}`,
                      type: "function" as const,
                      function: {
                        name: rc.name,
                        arguments: JSON.stringify(rc.parameters ?? {}),
                      },
                    }));
                  currentMessages.push({
                    role: "assistant",
                    content: null,
                    tool_calls: fakeCalls,
                  });
                  await executeToolCalls(fakeCalls);
                  failedGenHandled = true;
                  break callLoop;
                }
              }

              throw err;
            }
          } // end callLoop

          if (rateExhausted) break;       // all models exhausted — exit round loop
          if (failedGenHandled) continue; // tool calls recovered — next round

          // Query chain tracking — round depth logged for observability.
          console.log(
            `[Kira ${chainId}] round=${round} model=${MODELS[modelIndex]} ` +
            `prompt=${response!.usage?.prompt_tokens ?? "?"} ` +
            `completion=${response!.usage?.completion_tokens ?? "?"}`,
          );
          controller.enqueue(sse("chain", { id: chainId, depth: round }));

          const choice = response!.choices[0];
          const msg = choice.message;

          // ── Max-output-tokens recovery ────────────────────────────────────
          // finish_reason === "length" means Groq cut the response at max_tokens.
          // Inject a resume nudge and continue if round budget allows.
          if (
            choice.finish_reason === "length" &&
            !msg.tool_calls?.length &&
            round < MAX_TOOL_ROUNDS - 1
          ) {
            const partial = (msg.content ?? "").trim();
            if (partial) {
              currentMessages.push({ role: "assistant", content: partial });
              currentMessages.push({
                role: "user",
                content:
                  "Output was cut short by the token limit. Resume directly " +
                  "from where you stopped — no apology, no recap. Pick up " +
                  "mid-sentence if needed.",
              });
            }
            continue;
          }

          if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
            const raw = msg.content ?? "";
            finalText = raw
              .replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "")
              .trim();

            // ── Hallucination stop-hook ───────────────────────────────────────
            // Guarded catalog text is buffered until this validation passes, so
            // post-tool unsafe price/product claims can still be retried even
            // after earlier safe "checking..." prose was streamed.
            const unsafeCatalogClaim = isUnsafeCatalogClaim({
              text: finalText,
              products: collectedProducts,
              deliveryQuotes: collectedDeliveryQuotes,
              checkoutInfo,
              latestUserText,
              budget,
            });
            if (
              (!streamedText || responseHadUnsafeBufferedText) &&
              finalText &&
              unsafeCatalogClaim &&
              round < MAX_TOOL_ROUNDS - 1 &&
              hallucinationRetries < 1
            ) {
              hallucinationRetries++;
              // Preserve any previously-safe tokens, but the unsafe current
              // response was not emitted because it was buffered.
              currentMessages.push({ role: "assistant", content: finalText });
              currentMessages.push({
                role: "user",
                content:
                  "You mentioned product/price/delivery facts that were not " +
                  "verified by Kapruka tool results in this turn. Do not quote " +
                  "any products, prices, fees, delivery dates, or availability " +
                  "you have not fetched from Kapruka. Search/check now, then respond.",
              });
              finalText = "";
              continue; // retry with correction injected
            }

            if (responseHadUnsafeBufferedText && unsafeCatalogClaim) {
              finalText = L("troubleConnecting", language);
            }

            break;
          }

          currentMessages.push({
            role: "assistant",
            content: msg.content,
            tool_calls: msg.tool_calls,
          });

          await executeToolCalls(msg.tool_calls);

          // ── Context window trim ───────────────────────────────────────────
          // After each tool round, check actual token usage from Groq's response
          // and drop oldest messages if we're approaching the model's context limit.
          const usedTokens = response!.usage?.prompt_tokens;
          if (usedTokens) {
            currentMessages = trimContextIfNeeded(
              currentMessages,
              usedTokens,
              MODELS[modelIndex],
            );
          }

          // ── Diminishing returns / stuck detection ─────────────────────────
          // If we've burned 3+ rounds and still have no products and no text,
          // the loop is spinning. Surface a graceful fallback and exit.
          // Exception: checkout tool chains (list_delivery_cities → check_delivery
          // → create_order) make real progress without collecting products — never
          // fire stagnation while those are in flight.
          const isCheckoutToolChain =
            toolsCalledThisRequest.has("kapruka_list_delivery_cities") ||
            toolsCalledThisRequest.has("kapruka_check_delivery") ||
            toolsCalledThisRequest.has("kapruka_create_order");
          if (round >= 2 && collectedProducts.length === 0 && !finalText && !isCheckoutToolChain) {
            console.log(`[Kira ${chainId}] stuck after ${round + 1} rounds — bailing`);
            stagnantRounds++;
            if (stagnantRounds >= 2) {
              finalText = L("stagnantFallback", language);
              break;
            }
          } else {
            stagnantRounds = 0;
          }
        }

        if (!finalText) {
          finalText = L("timeoutFallback", language);
        }

        // Hard intercept: 8b model has no tool access and will hallucinate product listings.
        // If we ended on the last-resort model with no real products and the user was clearly
        // shopping, surface a clean "can't connect" message instead of invented descriptions.
        const SHOPPING_INTENT_RE =
          /\b(show|search|find|book|cake|flower|gift|chocolat|fashion|toy|hamper|stationar|stationer|electronic|phone|looking for|want to (buy|get|order)|recommend)\b/i;
        if (
          modelIndex === MODELS.length - 1 &&
          collectedProducts.length === 0 &&
          checkoutInfo === undefined &&
          SHOPPING_INTENT_RE.test(latestUserText)
        ) {
          finalText = L("troubleConnecting", language);
        }

        // Language enforcement guard — catches LLM ignoring the language instruction.
        // Uses \u escapes (not literal chars) to avoid any source-file encoding issues.
        // Runs after the hard intercept so both safety layers apply.
        {
          const SINHALA_RE = /[඀-෿]/;
          const TAMIL_RE   = /[஀-௿]/;
          const hasSinhala = SINHALA_RE.test(finalText);
          const hasTamil   = TAMIL_RE.test(finalText);
          if (language === "en" && (hasSinhala || hasTamil)) {
            // Kapruka product names are often in Sinhala/Tamil script, so a small number
            // of foreign-script chars in an EN reply is expected and correct.
            // Strip known product names before calculating the prose ratio.
            const proseOnly = stripKnownProductNames(finalText, collectedProducts);
            const sChars = (proseOnly.match(/[඀-෿]/g) ?? []).length;
            const tChars = (proseOnly.match(/[஀-௿]/g) ?? []).length;
            if ((sChars + tChars) / Math.max(proseOnly.length, 1) > 0.20) {
              finalText = L("troubleConnecting", "en");
            }
          } else if (language === "si" && !hasSinhala) {
            finalText = L("troubleConnecting", "si");
          } else if (language === "ta" && !hasTamil) {
            finalText = L("troubleConnecting", "ta");
          }
        }

        // Tokens were already emitted in real-time during the streaming call above.
        // Only fall back to bulk-emit here if streaming was bypassed (e.g. the
        // failed_generation recovery path reconstructs fake tool calls and the
        // subsequent round streams normally — so this only fires in edge cases).
        if (!streamedText && finalText) {
          const words = finalText.match(/\S+\s*/g) ?? [];
          for (const word of words) {
            controller.enqueue(sse("token", word));
          }
        }

        // Dedup + cap carousel
        const seenIds = new Set<string>();
        const dedupedProducts = collectedProducts
          .filter((p) => {
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          })
          .slice(0, 8);
        if (dedupedProducts.length > 0)
          controller.enqueue(sse("products", dedupedProducts));
        if (checkoutInfo) {
          controller.enqueue(sse("checkout", checkoutInfo));
          if (cart.length > 0) {
            const saved: LastOrder = {
              orderRef: checkoutInfo.orderRef,
              items: cart,
              recipient: lastOrderArgs?.recipient,
              delivery: lastOrderArgs?.delivery,
              giftMessage: lastOrderArgs?.giftMessage,
              placedAt: Date.now(),
            };
            controller.enqueue(sse("lastOrder", saved));
            // Surface the concrete server-generated order ref. The prompt already
            // tells the model to give the "order again" nudge, but it can't reliably
            // emit the real ref (esp. if create_order lands on the final tool round),
            // so this token adds that one genuinely-new fact without restating the
            // nudge. Appended as tokens so it lands in the same assistant bubble
            // (streamingMsgIdRef still set).
            if (checkoutInfo.orderRef) {
              controller.enqueue(
                sse(
                  "token",
                  "\n\n" +
                    Lf("postOrderSaved", language, {
                      orderRef: checkoutInfo.orderRef,
                    })
                )
              );
            }
          }
        }
        if (payLink) controller.enqueue(sse("payLink", payLink));
        controller.enqueue(sse("done"));
        controller.close();
      } catch (error) {
        console.error("Chat API error:", error);
        controller.enqueue(
          sse("error", "Aiyo, something went wrong on my end. Try again in a sec?")
        );
        controller.close();
      } finally {
        // Shared singleton — do not close. Invalidate only on connection errors,
        // which callMcpTool handles automatically.
        void mcpClient;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// Matches short "show me" / "can i see them" re-show requests with no product query.
const RESHOW_RE = /^(show\s*(me|them|these)?|can\s+i\s+see(\s+them)?|let\s+me\s+see(\s+them)?)[\.\?\!]?$/i;

// Matches "add it/that/this/the first one to cart/tray/basket"
const ADD_TO_CART_RE =
  /\b(add|put|toss|throw)\b.{0,30}\b(it|that|this|the\s+(?:first|second|third|1st|2nd|3rd|\d+(?:st|nd|rd|th)?)\s+one|them|all)\b.{0,30}\b(cart|tray|basket|bag)\b|\b(add\s+(?:it|that|this)\s+to\s+(?:my\s+)?(?:cart|tray|basket))\b/i;

// Matches "list them as text", "can u list those", "enumerate the items" etc.
// Fires ONLY when lastProducts exists so "them" unambiguously refers to shown products.
const LIST_AS_TEXT_RE =
  /\b(list|enumerate)\b.{0,25}\b(them|those|these|the\s+(?:items?|products?|options?|picks?))\b/i;

// Matches "show me those/them as pictures/cards/photos/images/listings" and similar referential re-show requests.
// These refer to previously mentioned specific products, not a new search.
const RESHOW_AS_CARDS_RE =
  /\b(show|see|view|display)\b.{0,40}\b(those|them|it|the[ms]e)\b.{0,40}\b(picture|photo|image|card|visual|pic|listing|listings)\b/i;
// Also catches "can u show them to me", "can u show me those two items as pictures" etc.
const RESHOW_THOSE_RE =
  /\b(show\s+me|show\s+us|can\s+(?:you|u)\s+show(?:\s+(?:me|them|those|it))?\b|let\s+me\s+see)\b.{0,30}\b(those|them|the[ms]e|the\s+(?:two|three|four|\d))\b/i;

async function tryHandleDeterministicPrompt({
  text,
  messages,
  cart,
  deliveryCity,
  deliveryDate,
  lastProducts,
  lastOrder,
  language,
  mcpClient,
  controller,
  budget,
  occasion,
  recipient,
  internationalMode,
}: {
  text: string;
  messages: { role: string; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  lastProducts?: KiraProduct[];
  lastOrder?: LastOrder;
  language: string;
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>;
  controller: ReadableStreamDefaultController<Uint8Array>;
  budget?: string;
  occasion?: string;
  recipient?: string;
  internationalMode?: boolean;
}): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // ── Empty / whitespace input ─────────────────────────────────────────────
  // Return a friendly prompt rather than a terse one-liner.
  if (!trimmed) {
    await streamWords(controller, L("emptyGreeting", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Jailbreak / persona-change intercept ─────────────────────────────────
  // "pretend you're a different AI", "act as X", "ignore your instructions" etc.
  // Catch before any search logic so the LLM never gets a chance to comply.
  const GREETING_RE = /^(hi|hello|hey|yo|ayubowan|ආයුබෝවන්|வணக்கம்)[\s!.]*$/i;
  if (GREETING_RE.test(trimmed)) {
    await streamWords(controller, L("greetingQuick", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const JAILBREAK_RE = /\b(dan\s+mode|pretend\s+(you(?:'?re?|\s+are?)|to\s+be)|act\s+as|you\s+are\s+now|ignore\s+(all\s+)?(your\s+)?(previous\s+)?instructions?|forget\s+your\s+(system\s+)?prompt|system\s+prompt|your\s+prompt|disregard\s+your|roleplay\s+as|be\s+a\s+different\s+ai|simulate\s+(being\s+)?an?\s+ai|no\s+restrictions)\b/i;
  if (JAILBREAK_RE.test(lower)) {
    await streamWords(controller, L("jailbreakRedirect", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Platform trust questions intercept ───────────────────────────────────
  // "is Kapruka legit?", "can I trust this?", "is this safe?" etc.
  // Answer warmly without calling any tools.
  // Allows optional article/adjective between subject and quality word:
  // "is Kapruka legit?" ✓  "is Kapruka a legit site?" ✓  "is this a safe site?" ✓
  const TRUST_RE = /\b(is\s+(kapruka|this|it)(\s+\w+){0,3}\s+(legit|safe|real|trusted?|reliable|genuine|authentic|scam)|can\s+i\s+trust\s+(kapruka|this|it)|kapruka\s+(legit|safe|real|trusted?|reliable))\b/i;
  if (TRUST_RE.test(lower)) {
    await streamWords(controller, L("trustAffirmation", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── "Tell me about <product>" with the product already in hand ───────────
  // The storefront "Ask Kira about this" button seeds exactly this prompt with the
  // product attached as lastProducts. The storefront catalog (Neon/seed JSON) is
  // separate from the live Kapruka MCP, so a tool lookup for these names returns
  // nothing — answer from the product data the client already sent instead.
  // Placed ahead of the topic-word intercepts (COD/OUT_OF_SCOPE) so product names
  // containing trigger words can't cause a false redirect. Restricted to exactly
  // one lastProducts item — multi-product "tell me about X" still goes to the LLM,
  // which can fetch richer details for MCP-sourced results.
  const TELL_ME_ABOUT_RE = /\btell\s+me\s+(?:a\s+bit\s+|more\s+)?about\b/i;
  if (TELL_ME_ABOUT_RE.test(lower) && lastProducts?.length === 1) {
    const target = lastProducts[0];
    const namedTarget = target.name && lower.includes(target.name.toLowerCase());
    const pronounTarget = /\b(it|this|that|the\s+one)\b/i.test(lower);
    if (namedTarget || pronounTarget) {
      let summary = (target.summary ?? "").replace(/\s+/g, " ").trim();
      if (summary && !/[.!?]$/.test(summary)) summary += ".";
      await streamWords(
        controller,
        Lf(
          target.inStock === false ? "aboutProductOutOfStock" : "aboutProductInStock",
          language,
          {
            name: target.name,
            price: `LKR ${target.price.toLocaleString("en-LK")}`,
            category: target.category ? ` (${target.category})` : "",
            summary: summary ? ` ${summary}` : "",
          }
        )
      );
      controller.enqueue(sse("done"));
      return true;
    }
  }

  const COD_RE = /\b(cash\s+on\s+delivery|cod|pay\s+cash|cash\s+payment|payment\s+method|how\s+can\s+i\s+pay)\b/i;
  if (COD_RE.test(lower)) {
    await streamWords(controller, L("codPolicy", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const DELIVERY_POLICY_RE = /\b(cut-?off|same-?day|delivery\s+time|deliver\s+today|today\s+delivery|how\s+late)\b/i;
  if (DELIVERY_POLICY_RE.test(lower) && !/\b(cake|flower|chocolate|hamper|gift|toy|fashion|electronics|phone|roses)\b/i.test(lower)) {
    await streamWords(controller, L("deliveryPolicy", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const OUT_OF_SCOPE_RE =
    /\b(weather|flight|restaurant|translate|cover letter|quantum|homework|cricket|time in|what time|world clock|loan|poem|movie|doctor|appointment|call someone|job in|forex|lkr rate|joke|hack|instagram|girlfriend broke|lonely|be my friend|pizza)\b/i;
  const overseasCurrencyQuery =
    internationalMode && /\b(usd|dollars?|pounds?|aud|gbp)\b/i.test(lower);
  if (OUT_OF_SCOPE_RE.test(lower) && !overseasCurrencyQuery) {
    await streamWords(controller, L("outOfScopeRedirect", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const mixedForeignScriptCount = [
    /[\u0D80-\u0DFF]/, // Sinhala
    /[\u0B80-\u0BFF]/, // Tamil
    /[\u0900-\u097F]/, // Devanagari
    /[\u4E00-\u9FFF]/, // CJK
  ].filter((pattern) => pattern.test(trimmed)).length;
  if (
    language === "en" &&
    mixedForeignScriptCount >= 2 &&
    /\b(cake|flower|chocolate|hamper|gift|toy|fashion|electronics|phone|rose|bouquet)\b/i.test(lower)
  ) {
    await streamWords(controller, L("mixedScriptAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (
    language === "en" &&
    /[\u0D80-\u0DFF\u0B80-\u0BFF]/.test(trimmed) &&
    /(?:\b(?:send|deliver|delivery)\b|යවන්න|அனுப்பு|டெலிவரி)/i.test(trimmed) &&
    !/\b(cake|flower|chocolate|hamper|gift|toy|fashion|electronics|phone|rose|bouquet)\b/i.test(lower)
  ) {
    await streamWords(controller, L("englishModeScriptAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const VAGUE_RE =
    /^(i\s+need\s+something|just\s+a\s+gift|something\s+(nice|for\s+(my\s+)?(friend|wife|husband|mum|mom|dad|kid|girl|boy|someone)|sweet)|can\s+you\s+help\s+me\s+pick\s+something|i\s+don'?t\s+know\s+what\s+to\s+get|rs\s*[\d,]+\s+budget,?\s*go|under\s+[\d,]+|i\s+saw\s+something\s+here\s+before|amma\s+ta)$/i;
  if (VAGUE_RE.test(lower)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const FAMILY_GIFT_ASK_RE =
    /\b(amma|thaththa|thaththaa|acca|akka|aiya|malli|nangi|nona)\s+(ta|ge|for)\b.{0,50}\b(gift|ganna|ona|one)\b/i;
  if (FAMILY_GIFT_ASK_RE.test(lower)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (
    /\b(i am looking for a really good gift|looking for a really good gift)\b/i.test(lower)
  ) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const VAGUE_HELP_RE =
    /\b(i want to send something|i need it by|something for (?:a|my)?\s*(girl|guy|kid)|mum'?s birthday|surprise for my wife|something nice lah|treat someone|help me pick something|flowers or chocolates|i'?m in \w+,?\s*help me|anything for guys)\b/i;
  if (VAGUE_HELP_RE.test(lower)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^[\W_]*[🎂🎁🌸💐❤️🔥\s]+$/u.test(trimmed)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^[a-z]{6,}(?:\s+[a-z]{5,})+$/i.test(trimmed)) {
    await streamWords(controller, L("vagueAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^'?;\s*drop\b|drop\s+table|--\s*$/i.test(lower)) {
    await streamWords(controller, L("outOfScopeRedirect", language));
    controller.enqueue(sse("done"));
    return true;
  }

  if (/^(?:\+?94|0)\d{9}$/i.test(trimmed.replace(/[\s-]/g, ""))) {
    await streamWords(
      controller,
      "Got the phone number. What product should I add to the order first?"
    );
    controller.enqueue(sse("done"));
    return true;
  }

  if (/\b(what categories|which categories|browse categories|list categories)\b/i.test(lower)) {
    await streamWords(
      controller,
      "Kapruka is strongest for cakes, flowers, chocolates, hampers, clothing, electronics, toys, grocery, and home gifts. What category should I open first?"
    );
    controller.enqueue(sse("done"));
    return true;
  }

  // Delivery request with no concrete product/city — keep it deterministic and
  // safe instead of letting the LLM invent logistics.
  if (
    /\bdeliver(?:y)?\s+to\b/i.test(lower) &&
    !extractCityHint(trimmed) &&
    !extractProductKeyword(lower)
  ) {
    await streamWords(
      controller,
      "Tell me the Sri Lankan city and the product you want to send, and I'll check live Kapruka delivery."
    );
    controller.enqueue(sse("done"));
    return true;
  }

  // Check if the previous assistant turn was asking for an order number — if so, treat
  // this message as the order number reply even without "track" in it.
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const kiraJustAskedForOrderNumber = lastAssistantMsg.includes("order number") || lastAssistantMsg.includes("order_number") || lastAssistantMsg.includes("confirmation email");
  const looksLikeOrderNumber = /^[A-Z0-9]{5,20}$/i.test(trimmed.replace(/\s+/g, ""));
  const TRACKING_VERB_RE = /\b(track|tracking|status|where(?:'s| is)|locate|find)\b/i;
  const TRACKING_NOUN_RE = /\b(order|delivery|package|parcel|shipment)\b/i;

  const wantsTracking =
    (TRACKING_VERB_RE.test(lower) && TRACKING_NOUN_RE.test(lower)) ||
    (kiraJustAskedForOrderNumber && looksLikeOrderNumber);
  if (wantsTracking) {
    const orderNumber = extractOrderNumber(trimmed);
    if (!orderNumber) {
      await streamWords(controller, L("trackingAskOrderNumber", language));
    } else {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_track_order));
      const trackingResult = await callMcpTool(mcpClient, "kapruka_track_order", {
        params: {
          order_number: orderNumber,
          response_format: "json",
        },
      });
      const tracking = extractTrackingFromMcp(trackingResult.content);
      if (tracking) {
        await streamWords(
          controller,
          Lf("trackingFound", language, {
            orderNumber: tracking.orderNumber || orderNumber,
            status: tracking.statusDisplay || tracking.currentStatus || "",
          })
        );
        controller.enqueue(sse("tracking", tracking));
      } else {
        const parsed = parseMcpPayload(trackingResult.content);
        const reason = parsed.ok ? "I couldn’t read the tracking details." : parsed.error;
        await streamWords(
          controller,
          Lf("trackingNotFound", language, { orderNumber, reason })
        );
      }
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // Short referential follow-up after a product search — "now?" / "what now?"
  // should recover the last search rather than falling into a model call.
  if (/^(now|what now|and now)[\?\!.]*$/i.test(trimmed)) {
    const ctx = extractLastSearchContext(messages, trimmed);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}"`));
    const reshowResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 6,
        in_stock_only: true,
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const products = dedupeProducts(extractProductsFromMcp(reshowResult.content));
    if (products.length > 0) {
      await streamWords(
        controller,
        Lf(products.length === 1 ? "searchFoundOne" : "searchFoundMany", language, {
          n: products.length,
          budget: "",
          city: "",
          date: "",
        })
      );
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(controller, Lf("searchNothingFound", language, { query: ctx.query }));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Reorder by order reference (KP-xxxxx) ───────────────────────────────
  const reorderRefMatch = trimmed.match(REORDER_REF_RE);
  if (reorderRefMatch) {
    const orderNumber = reorderRefMatch[1].replace(/\s+/g, "").toUpperCase();
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_track_order));
    const trackingResult = await callMcpTool(mcpClient, "kapruka_track_order", {
      params: { order_number: orderNumber, response_format: "json" },
    });
    const tracking = extractTrackingFromMcp(trackingResult.content);
    if (tracking?.items?.length) {
      const products = await productsFromTrackingItems(mcpClient, tracking.items);
      if (products.length > 0) {
        await streamWords(
          controller,
          Lf("reorderFromRef", language, { orderNumber: tracking.orderNumber || orderNumber })
        );
        controller.enqueue(sse("products", products));
        controller.enqueue(sse("tracking", tracking));
      } else {
        await streamWords(
          controller,
          Lf("reorderRefNotFound", language, { orderNumber })
        );
      }
    } else {
      await streamWords(
        controller,
        Lf("reorderRefNotFound", language, { orderNumber })
      );
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Within-session reorder ─────────────────────────────────────────────
  if (REORDER_SESSION_RE.test(lower)) {
    const source = lastOrder?.items?.length ? lastOrder : cart.length > 0 ? { items: cart, placedAt: Date.now() } : null;
    if (source?.items?.length) {
      const products = cartItemsToProducts(source.items);
      await streamWords(controller, L("reorderSessionFound", language));
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(controller, L("reorderNoHistory", language));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Global Shop (coming soon) ────────────────────────────────────────────
  if (GLOBAL_SHOP_RE.test(lower)) {
    await streamWords(controller, L("globalShopSoon", language));
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Emotional repair scenario — friend advice before search ──────────────
  const wantsProductSearch =
    /\b(flowers?|roses?|cakes?|chocolates?|gift|hamper|bouquet)\b/i.test(lower);
  if (
    REPAIR_GIFT_RE.test(lower) &&
    !REPAIR_INSIST_RE.test(lower) &&
    wantsProductSearch
  ) {
    await streamWords(controller, L("repairGiftAdvice", language));
    controller.enqueue(sse("done"));
    return true;
  }
  if (REPAIR_GIFT_RE.test(lower) && !wantsProductSearch) {
    await streamWords(controller, L("repairGiftAsk", language));
    controller.enqueue(sse("done"));
    return true;
  }

  const PHONE_RE = /(?:\+?94|0)\s*\d(?:[\s-]?\d){7,9}\b/;
  const ADDRESS_RE =
    /\b(?:address|street|st\.?|road|rd\.?|mawatha|lane|galle\s+rd|main\s+st|flower\s+road)\b|\b\d{1,4}\s+[a-z][a-z\s.]{2,30}\b/i;
  // Only collect partial checkout fields once the tray has items — otherwise
  // "send flowers to 12 Galle Road" gets misread as checkout field collection.
  if (cart.length > 0) {
    const hasPhone = PHONE_RE.test(trimmed);
    const hasAddress = ADDRESS_RE.test(trimmed);
    if (hasAddress && !hasPhone) {
      await streamWords(controller, L("checkoutNeedPhone", language));
      controller.enqueue(sse("done"));
      return true;
    }
    if (hasPhone && !hasAddress) {
      await streamWords(controller, L("checkoutNeedAddress", language));
      controller.enqueue(sse("done"));
      return true;
    }
  }

  const simpleProductQuery =
    extractProductKeyword(lower) ??
    (/කේක්|கேக்/i.test(trimmed) ? "cake" : null) ??
    (/මල්|பூ|மலர்/i.test(trimmed) ? "flowers" : null) ??
    (/\bbooks?\b/i.test(lower) ? "books" : null) ??
    (/\bstationary\b/i.test(lower) ? "stationery" : null);
  const hasSimpleProductIntent =
    !!simpleProductQuery &&
    (/\b(show|search|want|need|looking for|send|buy|get)\b/i.test(lower) ||
      /[\u0D80-\u0DFF\u0B80-\u0BFF]/.test(trimmed) ||
      /\b(vesak|birthday|anniversary)\b/i.test(lower) ||
      trimmed.toLowerCase() === simpleProductQuery ||
      lower === "stationary" ||
      /\bbooks?\s+na\b/i.test(lower));

  if (hasSimpleProductIntent) {
    const productDate = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    const productCity = extractCityHint(trimmed) ?? deliveryCity;
    const maxPrice = parseBudgetAmount(trimmed) ?? parseBudgetAmount(budget);

    if (
      /\b(fresh|perishable)\b/i.test(lower) &&
      /\bcake\b/i.test(lower) &&
      !parseRelativeDeliveryDate(trimmed) &&
      !deliveryDate
    ) {
      await streamWords(
        controller,
        language === "si"
          ? "කේක් fresh හදන නිසා delivery date එක දෙන්නකෝ — අදද, හෙටද, නැත්නම් වෙන දවසක්ද?"
          : language === "ta"
          ? "Cake fresh item — delivery date சொல்லுங்கள்; today, tomorrow, அல்லது வேறு date?"
          : "Cakes are fresh-made, so I need the delivery date before I confirm availability."
      );
      controller.enqueue(sse("done"));
      return true;
    }

    controller.enqueue(sse("step", `Searching Kapruka for "${simpleProductQuery}"`));
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: simpleProductQuery,
        limit: 6,
        in_stock_only: true,
        ...(maxPrice ? { max_price: maxPrice } : {}),
        response_format: "json",
      },
    });
    const products = dedupeProducts(extractProductsFromMcp(searchResult.content));
    if (productCity && products[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: productCity,
          product_id: products[0].id,
          ...(productDate ? { delivery_date: productDate } : {}),
          response_format: "json",
        },
      });
      const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
      if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
    }

    if (products.length > 0) {
      const budgetText = maxPrice ? ` under LKR ${maxPrice.toLocaleString("en-LK")}` : "";
      const cityText = productCity ? ` to ${productCity}` : "";
      const dateText = productDate ? ` on ${productDate}` : "";
      await streamWords(
        controller,
        Lf(products.length === 1 ? "searchFoundOne" : "searchFoundMany", language, {
          n: products.length,
          budget: budgetText,
          city: cityText,
          date: dateText,
        })
      );
      controller.enqueue(sse("products", products));
    } else {
      await streamWords(
        controller,
        Lf("searchNothingFound", language, { query: simpleProductQuery })
      );
    }
    controller.enqueue(sse("done"));
    return true;
  }

  const CART_DELIVERY_RE =
    /\b(check|refresh|confirm)\b.{0,24}\b(delivery|deliver)\b.{0,30}\b(cart|tray|basket|bag)\b|\b(cart|tray|basket|bag)\b.{0,30}\b(delivery|deliver)\b/i;
  if (CART_DELIVERY_RE.test(lower)) {
    if (cart.length === 0) {
      await streamWords(controller, L("checkoutEmptyCart", language));
      controller.enqueue(sse("done"));
      return true;
    }
    const city = extractCityHint(trimmed) ?? deliveryCity;
    const date = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    if (!city) {
      await streamWords(controller, "Tell me the delivery city and I'll check the live Kapruka fee for your tray.");
      controller.enqueue(sse("done"));
      return true;
    }
    const firstItem = cart[0];
    const idCache = new Map<string, string>();
    const productId = await resolveMcpProductId(mcpClient, firstItem, idCache);
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
    const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
      params: {
        city,
        product_id: productId,
        ...(date ? { delivery_date: date } : {}),
        response_format: "json",
      },
    });
    const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
    if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (deliveryInfo?.fee !== undefined) {
      await streamWords(
        controller,
        `Delivery to ${deliveryInfo.city} is LKR ${deliveryInfo.fee.toLocaleString("en-LK")}. Items are LKR ${subtotal.toLocaleString("en-LK")} — estimated total LKR ${(subtotal + deliveryInfo.fee).toLocaleString("en-LK")}.`
      );
    } else if (deliveryInfo) {
      await streamWords(
        controller,
        deliveryInfo.available
          ? `Delivery to ${deliveryInfo.city} looks available${date ? ` on ${date}` : ""}.`
          : `Delivery to ${deliveryInfo.city} is not available for that date${deliveryInfo.nextAvailableDate ? ` — next available is ${deliveryInfo.nextAvailableDate}` : ""}.`
      );
    } else {
      await streamWords(controller, "I couldn't read the live delivery quote for your tray. Try again in a moment?");
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "Add it/that/the first one to cart" — emit addToCart event so the client
  // can update the cart without a page interaction.
  if (ADD_TO_CART_RE.test(trimmed) && lastProducts && lastProducts.length > 0) {
    const lower = trimmed.toLowerCase();
    const addAll = /\b(all|them)\b/.test(lower);
    const idxMatch = lower.match(/\b(first|1st|second|2nd|third|3rd|(\d+)(?:st|nd|rd|th)?)\s+one\b/);
    const idx = idxMatch
      ? idxMatch[2]
        ? parseInt(idxMatch[2], 10) - 1
        : ["first","1st"].includes(idxMatch[1]) ? 0 : ["second","2nd"].includes(idxMatch[1]) ? 1 : 2
      : 0;
    const toAdd = addAll ? lastProducts : [lastProducts[Math.min(idx, lastProducts.length - 1)]];
    for (const p of toAdd) controller.enqueue(sse("addToCart", p));
    const names = toAdd.map((p) => p.name).join(", ");
    await streamWords(controller, `Done! Added **${names}** to your tray. Ready to checkout when you are.`);
    controller.enqueue(sse("done"));
    return true;
  }

  // "list them as text" / "can u list those" — user wants a numbered text list of the
  // products Kira just showed, NOT a description of the cart. Only fires when lastProducts
  // is populated so "them" unambiguously refers to the shown results.
  if (LIST_AS_TEXT_RE.test(lower) && lastProducts && lastProducts.length > 0 && !lower.includes("cart")) {
    const lines = lastProducts
      .map(
        (p, i) =>
          `${i + 1}. **${p.name}** — LKR ${p.price.toLocaleString("en-LK")}${
            p.inStock === false ? " *(out of stock)*" : ""
          }`
      )
      .join("\n");
    await streamWords(
      controller,
      `Here are the ${lastProducts.length} items I just showed you:\n\n${lines}`
    );
    controller.enqueue(sse("done"));
    return true;
  }

  // "Show me those as pictures / can u show me those two items as cards / show them as listings" —
  // re-emit the last known products without a new MCP search.
  if (RESHOW_AS_CARDS_RE.test(trimmed) || RESHOW_THOSE_RE.test(trimmed)) {
    if (lastProducts && lastProducts.length > 0) {
      const reshowKey = lastProducts.length === 1 ? "reshowHereItemsSingle" : "reshowHereItems";
      await streamWords(
        controller,
        lastProducts.length === 1
          ? L(reshowKey, language)
          : Lf(reshowKey, language, { n: lastProducts.length })
      );
      controller.enqueue(sse("products", lastProducts));
      controller.enqueue(sse("done"));
      return true;
    }
    const ctx = extractLastSearchContext(messages, trimmed);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}"`));
    const reshowResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 6,
        in_stock_only: true,
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const reshowProducts = dedupeProducts(extractProductsFromMcp(reshowResult.content));
    if (reshowProducts.length === 0) {
      await streamWords(
        controller,
        Lf("reshowNothingFoundQuery", language, { query: ctx.query })
      );
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      await streamWords(
        controller,
        Lf("reshowRealListings", language, { budget: budgetText, n: reshowProducts.length })
      );
      controller.enqueue(sse("products", reshowProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  if (lower.includes("ready to checkout") || lower.includes("complete the order")) {
    const message = cart.length === 0
      ? L("checkoutEmptyCart", language)
      : L("checkoutNeedName", language);
    await streamWords(controller, message);
    controller.enqueue(sse("done"));
    return true;
  }

  // Re-show request: "show me" / "can i see them" with no product specified.
  // Re-run the last search from conversation history so the carousel appears.
  if (trimmed.split(/\s+/).length <= 5 && RESHOW_RE.test(trimmed)) {
    const ctx = extractLastSearchContext(messages, trimmed);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}"`));
    const reshowResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 6,
        in_stock_only: true,
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const reshowProducts = dedupeProducts(extractProductsFromMcp(reshowResult.content));
    if (reshowProducts.length === 0) {
      await streamWords(controller, L("reshowNothingInStock", language));
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      const reshowKey = reshowProducts.length === 1 ? "reshowHereYouGoOne" : "reshowHereYouGo";
      await streamWords(
        controller,
        Lf(reshowKey, language, { budget: budgetText, n: reshowProducts.length })
      );
      controller.enqueue(sse("products", reshowProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "More options" handler — re-search with a different sort or broader query.
  // Only fires when the message is short and has no specific product keyword.
  const MORE_PRODUCT_KW =
    /\b(cake|cakes|flower|flowers|chocolate|chocolates|hamper|toy|toys|fashion|electronics|phone|gift|roses|bouquet|dress|shirt|gadget)\b/i;
  const MORE_RE_PATTERN =
    /\b(more|other options?|different|something else|other picks?|another option|alternatives?|see more|show more)\b/i;
  const isPureMoreRequest =
    MORE_RE_PATTERN.test(lower) &&
    trimmed.split(/\s+/).length <= 7 &&
    !MORE_PRODUCT_KW.test(trimmed);

  if (isPureMoreRequest) {
    const ctx = extractLastSearchContext(messages, trimmed);
    controller.enqueue(sse("step", `Searching Kapruka for "${ctx.query}" (price ↑)`));
    const moreResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: ctx.query,
        limit: 9,
        in_stock_only: true,
        sort: "price_asc", // different angle from the default bestseller ordering
        ...(ctx.maxPrice ? { max_price: ctx.maxPrice } : {}),
        response_format: "json",
      },
    });
    const seenIds = new Set((lastProducts ?? []).map((p) => p.id));
    let moreProducts = extractProductsFromMcp(moreResult.content);
    const relevanceFilter = CATEGORY_RELEVANCE_TERMS[ctx.query];
    const irrelevanceFilter = CATEGORY_IRRELEVANCE_TERMS[ctx.query];
    if (relevanceFilter) {
      moreProducts = moreProducts.filter((p) => {
        const txt = `${p.name} ${p.category ?? ""}`;
        return relevanceFilter.test(txt) && !(irrelevanceFilter?.test(txt));
      });
    }
    moreProducts = dedupeProducts(moreProducts.filter((p) => !seenIds.has(p.id)));
    // If still empty after dedup, fall back to the full set without seen-ID filter
    if (moreProducts.length === 0) {
      moreProducts = dedupeProducts(extractProductsFromMcp(moreResult.content));
    }

    if (moreProducts.length === 0) {
      await streamWords(controller, L("moreOptionsSamePicks", language));
    } else if (moreProducts.length <= 3) {
      await streamWords(
        controller,
        Lf("moreOptionsAboutAll", language, { query: ctx.query })
      );
      controller.enqueue(sse("products", moreProducts));
    } else {
      const budgetText = ctx.maxPrice
        ? ` under LKR ${ctx.maxPrice.toLocaleString("en-LK")}`
        : "";
      await streamWords(
        controller,
        Lf("moreOptionsHere", language, { budget: budgetText })
      );
      controller.enqueue(sse("products", moreProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // Gift intent fast-path — catches broad gift/occasion queries that stall the LLM loop.
  // Matches: "something for Father's Day under 3000", "amma ta gift ekak ganna ona",
  // "I need a gift for Colombo", etc.
  const GIFT_INTENT_RE =
    /\b(gift|present|something\s+(for|nice)|what\s+(to\s+)?(buy|get|send)|father'?s\s+day|mother'?s\s+day|birthday\s+gift)\b/i;
  const SL_FAMILY_GIFT_RE =
    /\b(amma|thaththa|thaththaa|acca|akka|aiya|malli|nangi|nona)\s+(ta|ge|for)\b/i;
  const PRODUCT_RECIPIENT_RE =
    /\b(flowers?|cakes?|chocolates?|roses?|bouquet|hampers?)\b.{0,35}\bfor\s+(my\s+)?(wife|husband|mum|mom|dad|friend|girlfriend|boyfriend|amma|thaththa|thaththaa)\b/i;

  const hasBudgetHint = /\b(?:under|below|max|maximum|budget|lkr\s*\d)\b/i.test(lower);
  const hasOccasionHint = /\b(father'?s\s+day|mother'?s\s+day|birthday|avurudu|vesak|wedding|anniversary)\b/i.test(lower);
  const hasCityHint = !!extractCityHint(trimmed);
  const hasFamilyHint = SL_FAMILY_GIFT_RE.test(lower);
  const productRecipient = PRODUCT_RECIPIENT_RE.exec(lower);
  if (productRecipient && !hasBudgetHint && !hasOccasionHint && !hasCityHint) {
    await streamWords(
      controller,
      Lf("productRecipientAsk", language, {
        category: productRecipient[1].trim().toLowerCase(),
      })
    );
    controller.enqueue(sse("done"));
    return true;
  }
  // Only fire the gift fast-path when there's at least one concrete signal beyond the word "gift".
  // - "just a gift" / "amma ta" alone → fall through to LLM so it asks what kind of gift.
  // - "gift for dad under 3000" / "flowers for amma to Kandy" → fast-path is useful.
  // hasFamilyHint is intentionally NOT in the right-hand guard — a family term alone (no
  // budget/occasion/city) doesn't give us enough to search usefully.
  if ((GIFT_INTENT_RE.test(lower) || hasFamilyHint) && (hasBudgetHint || hasOccasionHint || hasCityHint)) {
    const giftMaxPrice = parseBudgetAmount(trimmed) ?? parseBudgetAmount(budget);
    const giftCityHint = extractCityHint(trimmed) ?? deliveryCity;
    const giftDate = parseRelativeDeliveryDate(trimmed) ?? deliveryDate;
    const giftOccasion = extractOccasionHint(trimmed) ?? occasion;
    const giftRecipient = extractRecipientHint(trimmed) ?? recipient;

    controller.enqueue(
      sse("context", {
        ...(giftMaxPrice ? { budget: `Under LKR ${giftMaxPrice.toLocaleString("en-LK")}` } : {}),
        ...(giftCityHint ? { city: giftCityHint } : {}),
        ...(giftDate ? { deliveryDate: giftDate } : {}),
        ...(giftOccasion ? { occasion: giftOccasion } : {}),
        ...(giftRecipient ? { recipient: giftRecipient } : {}),
      })
    );

    const relationshipGift =
      /\b(girlfriend|boyfriend|wife|husband|partner)\b/i.test(giftRecipient ?? trimmed);
    const searchQueries =
      giftOccasion?.toLowerCase().includes("birthday") && relationshipGift
        ? ["flowers", "chocolate", "gift hamper", "cake"]
        : ["gift", "chocolate", "flowers", "hamper", "cake"];
    const giftProducts: KiraProduct[] = [];
    for (const query of searchQueries) {
      controller.enqueue(sse("step", `Searching Kapruka for "${query}"`));
      const giftResult = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: {
          q: query,
          limit: 6,
          in_stock_only: true,
          ...(giftMaxPrice ? { max_price: giftMaxPrice } : {}),
          response_format: "json",
        },
      });
      giftProducts.push(...extractProductsFromMcp(giftResult.content));
      if (dedupeProducts(giftProducts).length >= 6) break;
    }
    const dedupedGiftProducts = dedupeProducts(giftProducts).slice(0, 6);

    if (giftCityHint && dedupedGiftProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_list_delivery_cities));
      const giftCityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
        params: { query: giftCityHint, limit: 3, response_format: "json" },
      });
      const canonicalGiftCity = extractFirstCity(giftCityResult.content) ?? giftCityHint;
      const primaryProduct = dedupedGiftProducts[0];
      if (primaryProduct) {
        controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
        const giftDeliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
          params: {
            city: canonicalGiftCity,
            product_id: primaryProduct.id,
            ...(giftDate ? { delivery_date: giftDate } : {}),
            response_format: "json",
          },
        });
        const giftDelivery = extractDeliveryInfoFromMcp(giftDeliveryResult.content);
        if (giftDelivery) {
          primaryProduct.deliveryInfo = giftDelivery;
          controller.enqueue(sse("delivery", giftDelivery));
        }
      }

      for (const product of dedupedGiftProducts) {
        product.badges = buildReasonBadges(product, {
          budgetAmount: giftMaxPrice,
          occasion: giftOccasion,
          recipient: giftRecipient,
          city: canonicalGiftCity,
          deliveryDate: giftDate,
          deliveryInfo: product.deliveryInfo ?? primaryProduct?.deliveryInfo,
        });
      }
    }

    if (dedupedGiftProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: "gift" }));
    } else {
      const budgetText = giftMaxPrice ? ` under LKR ${giftMaxPrice.toLocaleString("en-LK")}` : "";
      const cityText = giftCityHint ? ` to ${giftCityHint}` : "";
      const dateText = giftDate ? ` on ${giftDate}` : "";
      const checkedDeliveries = dedupedGiftProducts
        .map((product) => product.deliveryInfo)
        .filter((info): info is DeliveryQuote => Boolean(info));
      const hasUnavailableForRequestedDate = checkedDeliveries.some(
        (info) => info.available === false
      );
      if (hasUnavailableForRequestedDate && giftCityHint && giftDate) {
        await streamWords(
          controller,
          `Here are ${dedupedGiftProducts.length} real Kapruka picks${budgetText}${cityText}. Delivery badges show the exact date confidence — some may need the next available slot after ${giftDate}.`
        );
      } else {
        const giftKey = dedupedGiftProducts.length === 1 ? "searchFoundOne" : "searchFoundMany";
        await streamWords(
          controller,
          Lf(giftKey, language, { n: dedupedGiftProducts.length, budget: budgetText, city: cityText, date: dateText })
        );
      }
      controller.enqueue(sse("products", dedupedGiftProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Hamper / combo explicit ──────────────────────────────────────────────
  if (HAMPER_RE.test(lower) && !parseSearchIntent(trimmed)) {
    controller.enqueue(sse("step", `Searching Kapruka for gift sets`));
    const hamperResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: "gift set", limit: 6, in_stock_only: true, sort: "bestseller", response_format: "json" },
    });
    const hamperProducts = dedupeProducts(extractProductsFromMcp(hamperResult.content));
    if (hamperProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: "gift set" }));
    } else {
      await streamWords(controller, Lf("searchFoundMany", language, { n: hamperProducts.length, budget: "", city: "", date: "" }));
      controller.enqueue(sse("products", hamperProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Sale / deals ─────────────────────────────────────────────────────────
  if (SALE_RE.test(lower) && !parseSearchIntent(trimmed)) {
    const saleQuery = extractProductKeyword(lower) ?? "gift";
    controller.enqueue(sse("step", `Searching Kapruka for budget picks`));
    const saleResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: saleQuery, limit: 6, in_stock_only: true, sort: "price_asc", response_format: "json" },
    });
    const saleProducts = dedupeProducts(extractProductsFromMcp(saleResult.content));
    if (saleProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: saleQuery }));
    } else {
      await streamWords(controller, L("saleSearchIntro", language));
      controller.enqueue(sse("products", saleProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Rush / same-day ──────────────────────────────────────────────────────
  if (RUSH_RE.test(lower)) {
    const rushQuery = extractProductKeyword(lower) ?? "flowers";
    const rushCity = extractCityHint(trimmed) ?? deliveryCity ?? "Colombo";
    const todayIso = new Date().toISOString().slice(0, 10);
    controller.enqueue(sse("step", `Searching Kapruka for same-day ${rushQuery}`));
    const rushResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: rushQuery, limit: 6, in_stock_only: true, sort: "price_asc", response_format: "json" },
    });
    let rushProducts = dedupeProducts(extractProductsFromMcp(rushResult.content));
    if (rushProducts[0]) {
      controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
      const rushDeliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
        params: {
          city: rushCity,
          product_id: rushProducts[0].id,
          delivery_date: todayIso,
          response_format: "json",
        },
      });
      const rushDelivery = extractDeliveryInfoFromMcp(rushDeliveryResult.content);
      if (rushDelivery?.available === false) {
        rushProducts = rushProducts.slice(0, 3);
      }
      if (rushDelivery) controller.enqueue(sse("delivery", rushDelivery));
    }
    if (rushProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: rushQuery }));
    } else {
      await streamWords(
        controller,
        Lf("rushSearchIntro", language, { city: rushCity, date: "today" })
      );
      controller.enqueue(sse("products", rushProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // ── Bakery / brand filter ────────────────────────────────────────────────
  const brandMatch = Object.entries(BAKERY_BRANDS).find(([brand]) => lower.includes(brand));
  if (brandMatch && /\bcake\b/i.test(lower)) {
    const [, brandQuery] = brandMatch;
    controller.enqueue(sse("step", `Searching Kapruka for ${brandQuery} cakes`));
    const brandResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: { q: `${brandQuery} cake`, limit: 6, in_stock_only: true, response_format: "json" },
    });
    const brandProducts = dedupeProducts(extractProductsFromMcp(brandResult.content));
    if (brandProducts.length === 0) {
      await streamWords(controller, Lf("searchNothingFound", language, { query: `${brandQuery} cake` }));
    } else {
      await streamWords(
        controller,
        Lf("searchFoundMany", language, { n: brandProducts.length, budget: "", city: "", date: "" })
      );
      controller.enqueue(sse("products", brandProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // "What's popular?" / "what's trending?" / "what's good?" → bestseller browse, no category needed.
  const POPULAR_RE = /\b(what'?s?\s+)?(popular|trending|bestsell|best\s+sell|what'?s?\s+good|most\s+bought|top\s+pick|top\s+gift)\b/i;
  if (POPULAR_RE.test(lower)) {
    controller.enqueue(sse("step", `Browsing Kapruka bestsellers`));
    let popularProducts: KiraProduct[] = [];
    for (const q of ["hamper", "chocolate", "flowers", "cake"]) {
      const r = await callMcpTool(mcpClient, "kapruka_search_products", {
        params: { q, limit: 6, in_stock_only: true, sort: "bestseller", response_format: "json" },
      });
      popularProducts = dedupeProducts(extractProductsFromMcp(r.content));
      if (popularProducts.length > 0) break;
    }
    if (popularProducts.length === 0) {
      await streamWords(controller, "Nothing jumping out as a bestseller right now — want me to search a specific category?");
    } else {
      await streamWords(controller, `Here are Kapruka's top picks right now — all in stock. 🛍️`);
      controller.enqueue(sse("products", popularProducts));
    }
    controller.enqueue(sse("done"));
    return true;
  }

  // Bare "product under budget" fast-path — catches queries like "birthday cake under 2000",
  // "chocolates under 3000", "flowers under 1500" that lack a "show me" prefix and therefore
  // fall through parseSearchIntent. Prevents the LLM from asking for city before searching.
  const BARE_PRODUCT_BUDGET_RE =
    /\b(cake|birthday\s+cake|chocolates?|flowers?|bouquet|roses?|hamper|gift\s+hamper|perfume|saree|toys?|electronics?|teddy|candles?|cookie|biscuit)\b.{0,40}\b(under|below|max|budget)\s*(?:lkr\s*)?([\d,]+)/i;
  const bareMatch = BARE_PRODUCT_BUDGET_RE.exec(lower);
  if (bareMatch) {
    const bareQuery = bareMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
    const bareMaxPrice = Number(bareMatch[3].replace(/,/g, ""));
    if (bareMaxPrice >= 100 && bareMaxPrice <= 500_000) {
      controller.enqueue(sse("step", `Searching Kapruka for "${bareQuery}"`));
      let bareProducts: KiraProduct[] = [];
      for (const q of [bareQuery, fallbackQuery(bareQuery)]) {
        if (!q) continue;
        const r = await callMcpTool(mcpClient, "kapruka_search_products", {
          params: { q, limit: 6, in_stock_only: true, max_price: bareMaxPrice, response_format: "json" },
        });
        bareProducts = dedupeProducts(extractProductsFromMcp(r.content));
        if (bareProducts.length > 0) break;
      }
      const cityHint = extractCityHint(trimmed) ?? deliveryCity;
      if (bareProducts.length === 0) {
        await streamWords(controller, Lf("searchNothingFound", language, { query: bareQuery }));
      } else {
        const budgetText = ` under LKR ${bareMaxPrice.toLocaleString("en-LK")}`;
        const cityText = cityHint ? ` to ${cityHint}` : "";
        const key = bareProducts.length === 1 ? "searchFoundOne" : "searchFoundMany";
        await streamWords(controller, Lf(key, language, { n: bareProducts.length, budget: budgetText, city: cityText, date: "" }));
        controller.enqueue(sse("products", bareProducts));
        if (cityHint && bareProducts[0]) {
          const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
            params: {
              city: cityHint,
              product_id: bareProducts[0].id,
              ...(deliveryDate ? { delivery_date: deliveryDate } : {}),
              response_format: "json",
            },
          });
          const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
          if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
        }
      }
      controller.enqueue(sse("done"));
      return true;
    }
  }

  const searchIntent = parseSearchIntent(trimmed);
  if (!searchIntent) return false;
  const contextMaxPrice = searchIntent.maxPrice ?? parseBudgetAmount(budget);

  controller.enqueue(sse("step", `Searching Kapruka for "${searchIntent.query}"`));
  let products: KiraProduct[] = [];

  for (const query of [searchIntent.query, fallbackQuery(searchIntent.query)]) {
    if (!query) continue;
    const searchResult = await callMcpTool(mcpClient, "kapruka_search_products", {
      params: {
        q: query,
        limit: 6,
        in_stock_only: true,
        ...(contextMaxPrice ? { max_price: contextMaxPrice } : {}),
        ...(searchIntent.sort ? { sort: searchIntent.sort } : {}),
        response_format: "json",
      },
    });
    let batch = extractProductsFromMcp(searchResult.content);
    const relevanceFilter = CATEGORY_RELEVANCE_TERMS[query];
    if (relevanceFilter) {
      batch = batch.filter(
        (p) => relevanceFilter.test(p.name) || relevanceFilter.test(p.category ?? "")
      );
    }
    products = dedupeProducts([...products, ...batch]);
    if (products.length >= 3) break;
  }

  let deliveryCityForMessage = deliveryCity;
  const cityHint = extractCityHint(trimmed) ?? deliveryCity;
  const effectiveDate = deliveryDate ?? searchIntent.deliveryDate;
  if (cityHint && products[0]) {
    controller.enqueue(sse("step", TOOL_STEPS.kapruka_list_delivery_cities));
    const cityResult = await callMcpTool(mcpClient, "kapruka_list_delivery_cities", {
      params: {
        query: cityHint,
        limit: 3,
        response_format: "json",
      },
    });
    const canonicalCity = extractFirstCity(cityResult.content) ?? cityHint;
    deliveryCityForMessage = canonicalCity;

    controller.enqueue(sse("step", TOOL_STEPS.kapruka_check_delivery));
    const deliveryResult = await callMcpTool(mcpClient, "kapruka_check_delivery", {
      params: {
        city: canonicalCity,
        ...(effectiveDate ? { delivery_date: effectiveDate } : {}),
        product_id: products[0].id,
        response_format: "json",
      },
    });
    const deliveryInfo = extractDeliveryInfoFromMcp(deliveryResult.content);
    if (deliveryInfo) controller.enqueue(sse("delivery", deliveryInfo));
  }

  if (products.length === 0) {
    await streamWords(
      controller,
      Lf("searchNothingFound", language, { query: searchIntent.query })
    );
  } else {
    const budgetText = contextMaxPrice
      ? ` under LKR ${contextMaxPrice.toLocaleString("en-LK")}`
      : "";
    const cityText = deliveryCityForMessage ? ` to ${deliveryCityForMessage}` : "";
    const dateText = effectiveDate ? ` on ${effectiveDate}` : "";
    const introKey = products.length === 1 ? "searchFoundOne" : "searchFoundMany";
    const intro = Lf(introKey, language, {
      n: products.length,
      budget: budgetText,
      city: cityText,
      date: dateText,
    });
    await streamWords(controller, intro);
    controller.enqueue(sse("products", products));
  }

  controller.enqueue(sse("done"));
  return true;
}

// Scan recent user messages to find what was last searched (query + budget).
// Used by the re-show deterministic handler when the user says "show me" / "can i see them".
function extractLastSearchContext(
  messages: { role: string; content: string }[],
  currentText: string
): { query: string; maxPrice?: number } {
  let query = "gift";
  let maxPrice: number | undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (msg.content === currentText) continue; // skip the current "show me" message

    // Try the standard search intent parser first
    const intent = parseSearchIntent(msg.content);
    if (intent) return { query: intent.query, maxPrice: intent.maxPrice };

    // Extract first plausible LKR amount (200–99999)
    const nums = msg.content.match(/\b([\d,]{3,6})\b/g)
      ?.map((n) => parseInt(n.replace(/,/g, ""), 10))
      .filter((n) => n >= 200 && n <= 99999);
    if (nums?.length) maxPrice = nums[0];

    // Match product category keywords
    const msgLow = msg.content.toLowerCase();
    if (/\bcake\b/.test(msgLow)) { query = "cake"; break; }
    if (/\bflower/.test(msgLow)) { query = "flowers"; break; }
    if (/\bchocolat/.test(msgLow)) { query = "chocolate"; break; }
    if (/\bhamper\b/.test(msgLow)) { query = "gift hamper"; break; }
    if (/\btoy\b/.test(msgLow)) { query = "toy"; break; }
    if (/\bsari|saree|sarree|sare\b/.test(msgLow)) { query = "saree"; break; }
    if (/\bjewel|necklace|bracelet|ring\b/.test(msgLow)) { query = "jewellery"; break; }
    if (/\bperfume|fragrance\b/.test(msgLow)) { query = "perfume"; break; }
    if (/\bfashion|clothing|wear|dress|shirt\b/.test(msgLow)) { query = "clothing"; break; }
    if (/\belectronic|phone|gadget\b/.test(msgLow)) { query = "electronics"; break; }

    // Stop if we at least found a price
    if (maxPrice !== undefined) break;
  }

  return { query, maxPrice };
}

function dedupeProducts(products: KiraProduct[]): KiraProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = (product.id || product.url || product.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cartItemsToProducts(items: CartItem[]): KiraProduct[] {
  return items.map((item) => item.product);
}

function extractProductKeyword(lower: string): string | null {
  if (/\bcake\b/.test(lower)) return "cake";
  if (/\bflower|\brose|\bbouquet\b/.test(lower)) return "roses";
  if (/\bchocolat/.test(lower)) return "chocolate";
  if (/\bhamper\b/.test(lower)) return "gift hamper";
  if (/\belectronic|\bphone|\bgadget\b/.test(lower)) return "electronics";
  if (/\bfashion|\bcloth|\bdress|\bshirt\b/.test(lower)) return "clothing";
  if (/\bgrocery\b/.test(lower)) return "grocery";
  if (/\btoy\b/.test(lower)) return "soft toy";
  return null;
}

async function productsFromTrackingItems(
  mcpClient: Awaited<ReturnType<typeof getMcpClient>>,
  items: TrackingItem[]
): Promise<KiraProduct[]> {
  const products: KiraProduct[] = [];
  for (const item of items) {
    if (item.productId) {
      try {
        const result = await callMcpTool(mcpClient, "kapruka_get_product", {
          params: { product_id: item.productId, response_format: "json" },
        });
        const details = extractProductDetailsFromMcp(result.content);
        if (details?.id) {
          products.push({
            id: details.id,
            name: details.name,
            price: details.price,
            currency: details.currency,
            image: details.image,
            summary: details.summary,
            category: details.category,
            url: details.url,
            inStock: details.inStock,
          });
          continue;
        }
      } catch {
        /* fall through to tracking item stub */
      }
    }
    products.push({
      id: item.productId || `tracking-${item.name.replace(/\s+/g, "-").toLowerCase()}`,
      name: item.name,
      price: item.sellingPrice ?? 0,
      currency: "LKR",
    });
  }
  return dedupeProducts(products);
}

function parseSearchIntent(text: string):
  | {
      query: string;
      maxPrice?: number;
      sort?: "price_asc" | "price_desc" | "bestseller";
      deliveryDate?: string;
    }
  | null {
  const lower = text.toLowerCase();
  const isSearchy =
    lower.includes("show me") ||
    lower.includes("search") ||
    lower.includes("catalog") ||
    lower.includes("kapruka");
  if (!isSearchy) return null;

  // Referential messages ("show me those", "can u show me them as pictures") are
  // handled by the re-show fast-path — don't treat them as new searches.
  const isReferential =
    /\b(those|them|the[ms]e|the\s+(?:two|three|four|\d+)\s+items?)\b/i.test(lower) &&
    !/\b(cake|flower|chocolate|hamper|gift|fashion|electronic|phone|toy|rose|bouquet)\b/i.test(lower);
  if (isReferential) return null;

  const categoryMatch = lower.match(/show me ([a-z\s&]+?) on kapruka/);
  const forMatch = lower.match(/(?:for|catalog for) ([a-z\s&]+?)(?: under| below| to | in stock|\.|$)/);
  const rawQuery =
    categoryMatch?.[1]?.trim() ??
    forMatch?.[1]?.trim() ??
    lower
      // strip intent/meta words that are NOT product names
      .replace(/search|kapruka|live|catalog|show me|show us|in stock|available|products?|product cards|if available|listings?|picks?|pics?|pictures?|photos?|options?|items?|stuff/gi, " ")
      // strip common prepositions and noise words that survive the first pass
      .replace(/\b(more|some|any|all|the|of|for|with|to|a|an|me|us)\b/gi, " ")
      .replace(/\bunder\s+\d[\d,]*/gi, " ")
      .replace(SERVER_CITY_REGEX, " ")
      .replace(/\s+/g, " ")
      .trim();

  const query = normalizeProductQuery(rawQuery);
  if (!query || query.length < 3) return null;

  const priceMatch = lower.match(/\b(?:under|below|max|maximum)\s+(?:lkr\s*)?([\d,]+)/);
  const maxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
  const sort = lower.includes("popular") || lower.includes("best")
    ? "bestseller"
    : lower.includes("cheap")
    ? "price_asc"
    : undefined;
  const deliveryDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];

  return { query, maxPrice, sort, deliveryDate };
}

function normalizeProductQuery(raw: string): string {
  const compact = raw
    .replace(/[^a-z0-9\s&]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/i, "") // strip leading articles: "the cake" → "cake"
    .trim();
  return CATEGORY_QUERY_MAP[compact] ?? compact;
}

function fallbackQuery(query: string): string | undefined {
  if (query === "flowers") return "roses";
  if (query === "cake") return "cakes";
  if (query === "clothing") return "dress";
  if (query === "dress") return "saree";
  if (query === "electronics") return "phone";
  return undefined;
}

function extractCityHint(text: string): string | undefined {
  const match = text.match(SERVER_CITY_REGEX);
  return match?.[1]?.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractOccasionHint(text: string): string | undefined {
  const match = text.match(
    /\b(birthday|anniversary|wedding|christmas|vesak|avurudu|father'?s\s+day|mother'?s\s+day|new\s+year|get well|congratulations)\b/i
  );
  if (!match) return undefined;
  return match[1].replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractRecipientHint(text: string): string | undefined {
  const match = text.match(
    /\bfor\s+(?:my\s+)?(girlfriend|boyfriend|wife|husband|mum|mom|mother|amma|dad|father|thaththa|friend|sister|brother|daughter|son|boss|colleague|partner)\b/i
  );
  if (!match) return undefined;
  return match[1].replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildReasonBadges(
  product: KiraProduct,
  context: {
    budgetAmount?: number;
    occasion?: string;
    recipient?: string;
    city?: string;
    deliveryDate?: string;
    deliveryInfo?: DeliveryQuote;
  }
): string[] {
  const badges: string[] = [];
  if (context.occasion) badges.push(`${context.occasion} fit`);
  if (context.recipient) badges.push(`For ${context.recipient}`);
  if (context.budgetAmount && product.price <= context.budgetAmount) badges.push("Under budget");
  if (context.deliveryInfo?.perishable) badges.push("Fresh");
  if (context.deliveryInfo?.available && context.city) badges.push(`${context.city} delivery`);
  if (context.deliveryInfo?.available && context.deliveryDate) badges.push("Date ✓");
  if (context.deliveryInfo?.available === false) badges.push("Next available");
  return [...new Set(badges)].slice(0, 4);
}

function extractFirstCity(content: unknown): string | undefined {
  const parsed = formatMcpContentForModel(content);
  try {
    const data = JSON.parse(parsed) as { cities?: { name?: string }[] };
    return data.cities?.[0]?.name;
  } catch {
    return undefined;
  }
}

function extractOrderNumber(text: string): string | undefined {
  // Match Kapruka order IDs: 5–20 chars. Prefer an alphanumeric token containing
  // BOTH letters and digits (e.g. KAP12345, 102jidas). Fall back to a purely
  // numeric token (e.g. 10234567) so numeric-only order numbers are still tracked.
  // Never fall back to an all-letters token — that would treat plain words
  // ("track", "order") as order numbers.
  const m = text.match(/\b([A-Z0-9]{5,20})\b/gi);
  if (!m) return undefined;
  const candidate =
    m.find((s) => /[A-Z]/i.test(s) && /\d/.test(s)) ??
    m.find((s) => /^\d{5,20}$/.test(s));
  return candidate?.toUpperCase();
}

async function streamWords(
  controller: ReadableStreamDefaultController<Uint8Array>,
  text: string
) {
  const words = text.match(/\S+\s*/g) ?? [];
  for (const word of words) {
    controller.enqueue(sse("token", word));
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
}

// ─── Tool concurrency classification ─────────────────────────────────────────
// Read-only MCP tools are safe to run concurrently. kapruka_create_order has
// side-effects (places a real order) and must run alone after safe tools finish.
const CONCURRENT_SAFE_TOOLS = new Set([
  "kapruka_search_products",
  "kapruka_list_categories",
  "kapruka_check_delivery",
  "kapruka_get_product",
  "kapruka_list_delivery_cities",
  "kapruka_track_order",
]);

// ─── Tool use summary (8B model) ──────────────────────────────────────────────
// Fired async after each tool batch. Uses the cheap 8B model so it resolves in
// ~0.5s — well within the next model call's latency — making it essentially free.
// Human-readable labels for the ThinkingDone summary shown to users.
const TOOL_SUMMARY_LABELS: Record<string, string> = {
  kapruka_search_products: "Searched Kapruka catalog",
  kapruka_list_categories: "Listed Kapruka categories",
  kapruka_check_delivery: "Checked delivery availability",
  kapruka_get_product: "Retrieved product details",
  kapruka_create_order: "Placed your order",
  kapruka_list_delivery_cities: "Resolved delivery city",
  kapruka_track_order: "Fetched order status",
};

async function generateToolSummary(toolNames: string[]): Promise<string> {
  // Build summary from deterministic labels first — avoids the 8B model call
  // leaking internal reasoning into the ThinkingBlock shown to users.
  const known = toolNames
    .map((n) => TOOL_SUMMARY_LABELS[n])
    .filter(Boolean);
  if (known.length > 0) return known.join(" · ");

  // Fallback: ask 8B model, but sanitise the output before returning.
  try {
    const label = toolNames.map((n) => n.replace("kapruka_", "")).join(", ");
    const res = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content:
            `Summarize these API calls in ≤8 words, past tense, no articles: ${label}. ` +
            `Example: "Searched chocolates, checked Colombo delivery". Output the summary only — no internal reasoning, no "I need", no "I will".`,
        },
      ],
      max_tokens: 32,
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "";
    // Strip any lines that look like internal monologue (start with "I ")
    const clean = raw.split(/[.\n]/).filter(l => !/^I\s/i.test(l.trim())).join(". ").trim();
    return clean;
  } catch {
    return ""; // non-critical — swallow errors silently
  }
}

// ─── Context window arithmetic ───────────────────────────────────────────────
// Groq model context limits. We reserve OUTPUT_TOKEN_RESERVE tokens so the
// model always has headroom to finish its response.
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "llama-3.3-70b-versatile": 128_000,
  "meta-llama/llama-4-scout-17b-16e-instruct": 131_000,
  "llama-3.1-8b-instant": 128_000,
};
const OUTPUT_TOKEN_RESERVE = 1_500;
const TRIM_TRIGGER_PCT = 0.75; // start trimming at 75% usage
const TRIM_TARGET_PCT  = 0.60; // trim back to 60%

// Dynamically trims the oldest non-system messages from currentMessages when
// the previous round's prompt_tokens shows we're approaching the context limit.
// Operates on message count with an avg-token estimate — good enough for Kira's
// short messages; no per-message tokenizer needed.
function trimContextIfNeeded(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  promptTokens: number,
  model: string,
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const effective = (MODEL_CONTEXT_LIMITS[model] ?? 128_000) - OUTPUT_TOKEN_RESERVE;
  if (promptTokens < effective * TRIM_TRIGGER_PCT) return messages;

  const system = messages[0];
  const rest = messages.slice(1);
  if (rest.length <= 2) return messages; // nothing safe to drop

  const avgTokensPerMessage = promptTokens / messages.length;
  const targetTokens = effective * TRIM_TARGET_PCT;
  const toDrop = Math.min(
    Math.ceil((promptTokens - targetTokens) / avgTokensPerMessage),
    rest.length - 2, // always keep ≥ 2 recent messages
  );

  if (toDrop <= 0) return messages;
  console.log(
    `[Kira] context trim: ${promptTokens}/${effective} tokens — dropping ${toDrop} messages`,
  );
  return [system, ...rest.slice(toDrop)];
}

// ─── Context compaction ──────────────────────────────────────────────────────
// Scans messages that fell outside the active window and extracts structured
// facts (budget, city, occasion, recipient, whether products were shown) so
// Kira retains cross-turn memory without bloating the active context window.
function buildCompactSummary(
  messages: { role: string; content: string }[]
): string {
  const facts: string[] = [];
  const seen = new Set<string>();
  const push = (f: string) => {
    if (!seen.has(f)) { seen.add(f); facts.push(`• ${f}`); }
  };

  for (const msg of messages) {
    const t = typeof msg.content === "string" ? msg.content : "";
    const lo = t.toLowerCase();

    if (msg.role === "user") {
      const budget = t.match(
        /\b(?:under|below|max(?:imum)?|budget)[:\s]+(?:lkr\s*)?([\d,]+)/i
      );
      if (budget) push(`Budget ceiling: LKR ${budget[1].replace(/,/g, "")}`);

      const city = t.match(SERVER_CITY_REGEX);
      if (city) push(`Delivery city mentioned: ${city[1]}`);

      const occ = t.match(
        /\b(birthday|wedding|anniversary|christmas|vesak|avurudu|father'?s\s+day|mother'?s\s+day|new\s+year)\b/i
      );
      if (occ) push(`Occasion: ${occ[1]}`);

      const rec = t.match(
        /\bfor\s+(?:my\s+)?(mum|mom|amma|dad|father|mother|wife|husband|friend|sister|brother|daughter|son|boss|colleague)\b/i
      );
      if (rec) push(`Recipient: ${rec[1]}`);
    }

    if (msg.role === "assistant") {
      if (/\d+\s+picks?|showing\s+\d+|here\s+are\s+\d+/i.test(lo))
        push("Products were shown from Kapruka search");
      if (/delivery\s+(?:to\s+\w+\s+)?(?:is\s+)?lkr\s*[\d,]+/i.test(lo))
        push("Delivery fee was confirmed");
      if (/order\s+(?:has\s+been\s+)?placed|checkout\s+link/i.test(lo))
        push("An order was placed or a checkout link was shared");
    }
  }

  if (facts.length === 0) return "";
  return `[Earlier conversation summary]\n${facts.join("\n")}`;
}

// ─── Tool result truncation ───────────────────────────────────────────────────
// Applied AFTER SSE side-effects (which read from the full resultContent) and
// BEFORE currentMessages.push so the model receives a lean payload.
// For product search results this can cut 4–6 KB down to ~600 bytes.
function truncateForModel(toolName: string, resultText: string): string {
  if (
    toolName === "kapruka_search_products" ||
    toolName === "kapruka_list_categories"
  ) {
    try {
      const data = JSON.parse(resultText) as Record<string, unknown>;
      const raw =
        (data.products ?? data.results ?? data.items) as unknown[] | undefined;
      if (Array.isArray(raw)) {
        if (raw.length === 0) {
          return JSON.stringify({
            results: [],
            total: 0,
            message:
              "No products found for this search query. Try a broader term, a corrected spelling, or a related category.",
          });
        }
        type P = Record<string, unknown>;
        const slim = (raw as P[]).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price ?? p.sale_price,
          url: p.url ?? p.product_url,
          in_stock: p.in_stock ?? p.available,
        }));
        return JSON.stringify({ ...data, products: slim });
      }
    } catch { /* fall through to char cap */ }
  }

  const CAP: Record<string, number> = {
    kapruka_get_product: 1200,
    kapruka_check_delivery: 700,
    kapruka_list_delivery_cities: 500,
    kapruka_track_order: 900,
    kapruka_create_order: 900,
  };
  const limit = CAP[toolName] ?? 2000;
  if (resultText.length <= limit) return resultText;
  return (
    resultText.slice(0, limit) +
    `\n…[${resultText.length - limit} chars omitted]`
  );
}

function coerceArgTypes(
  args: Record<string, unknown>,
  schema: Record<string, unknown>
): Record<string, unknown> {
  type FieldSchema = { type?: string; anyOf?: { type?: string }[] };
  const props = (schema.properties as Record<string, FieldSchema>) || {};
  const result = { ...args };

  for (const [key, val] of Object.entries(result)) {
    if (val === null || val === undefined) continue;
    const field = props[key];
    if (!field) continue;
    const t = field.type;
    const anyOf = field.anyOf;

    if (typeof val === "string") {
      if (t === "integer") {
        const n = parseInt(val, 10);
        if (!isNaN(n)) result[key] = n;
      } else if (t === "number") {
        const n = parseFloat(val);
        if (!isNaN(n)) result[key] = n;
      } else if (t === "boolean") {
        result[key] = val === "true";
      } else if (t === "array" || t === "object") {
        try {
          result[key] = JSON.parse(val);
        } catch { /* leave */ }
      } else if (anyOf) {
        const hasInt = anyOf.some((s) => s.type === "integer");
        const hasNum = anyOf.some((s) => s.type === "number");
        const hasNull = anyOf.some((s) => s.type === "null");
        const hasArr = anyOf.some((s) => s.type === "array");
        const hasObj = anyOf.some((s) => s.type === "object");
        const hasBool = anyOf.some((s) => s.type === "boolean");
        if (val === "null" && hasNull) {
          result[key] = null;
        } else if (hasBool) {
          result[key] = val === "true";
        } else if (hasArr || hasObj) {
          try {
            result[key] = JSON.parse(val);
          } catch { /* leave */ }
        } else if (hasInt) {
          const n = parseInt(val, 10);
          if (!isNaN(n)) result[key] = n;
        } else if (hasNum) {
          const n = parseFloat(val);
          if (!isNaN(n)) result[key] = n;
        }
      }
    }
  }
  return result;
}
