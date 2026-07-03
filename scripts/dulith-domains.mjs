/**
 * dulith-domains.mjs — Registry of Dulith-gated QA domains.
 * Each domain: plan doc → founder review → edge suite → orchestrator gate ≥90%.
 */

export const BASE_CRITERIA = [
  {
    id: "root_cause",
    weight: 2,
    test: (t) => /problem|root cause|bug|failure|whack-a-mole|why/i.test(t),
    note: "Names the failure class and why regex-only fixes fail",
  },
  {
    id: "strategy",
    weight: 2,
    test: (t) => /strategy|layer|approach|handler|route/i.test(t),
    note: "Clear architectural strategy (not patch list)",
  },
  {
    id: "automated_qa",
    weight: 2,
    test: (t) => /Group [A-Z]|edge|persona|orchestrator|cases/i.test(t),
    note: "Automated edge-case suite with named group",
  },
  {
    id: "ceo_gate",
    weight: 1,
    test: (t) => /90%|CEO|Dulith|founder|excitement/i.test(t),
    note: "Founder score gate ≥90%",
  },
  {
    id: "success_metrics",
    weight: 1,
    test: (t) => /success criteria|live repro|target/i.test(t),
    note: "Concrete pass/fail metrics",
  },
  {
    id: "sr_lanka_relevance",
    weight: 1,
    test: (t) => /Kapruka|Colombo|delivery|Sinhala|Tanglish|Sri Lanka/i.test(t),
    note: "Local market / Kapruka context",
  },
  {
    id: "explicit_non_goals",
    weight: 1,
    test: (t) => /do NOT|explicitly do not|not do|never/i.test(t),
    note: "Clear non-goals",
  },
];

export const DOMAINS = [
  {
    id: "search-routing",
    title: "Search routing & multi-category combos",
    plan: "docs/SEARCH-ROUTING-PLAN.md",
    group: "S",
    generator: "generate-search-edge.mjs",
    smoke: 25,
    extraCriteria: [
      {
        id: "multi_category",
        weight: 1,
        test: (t) => /multi-category|combo|flowers and chocolates/i.test(t),
        note: "Multi-category combo routing",
      },
      {
        id: "filter_safety",
        weight: 1,
        test: (t) => /safety net|filter|cake exclusion|flower-themed/i.test(t),
        note: "Filter safety net for MCP noise",
      },
    ],
  },
  {
    id: "category-purity",
    title: "Single-category carousel purity",
    plan: "docs/CATEGORY-PURITY-PLAN.md",
    group: "T",
    generator: "generate-category-purity.mjs",
    smoke: 20,
    extraCriteria: [
      {
        id: "junk_traps",
        weight: 2,
        test: (t) => /junk|greeting card|pen set|topper|candle|hamper.*soap/i.test(t),
        note: "Named junk traps per category",
      },
      {
        id: "single_lane",
        weight: 1,
        test: (t) => /single category|one lane|purity/i.test(t),
        note: "Single-category focus",
      },
    ],
  },
  {
    id: "context-bleed",
    title: "Multi-turn search context bleed",
    plan: "docs/CONTEXT-BLEED-PLAN.md",
    group: "U",
    generator: "generate-context-bleed.mjs",
    smoke: 15,
    extraCriteria: [
      {
        id: "current_turn_wins",
        weight: 2,
        test: (t) => /current turn|prior turn|bleed|context/i.test(t),
        note: "Current message category wins over prior turns",
      },
      {
        id: "multi_turn",
        weight: 1,
        test: (t) => /multi-turn|follow-up|options under|show me again/i.test(t),
        note: "Multi-turn test coverage",
      },
    ],
  },
  {
    id: "vague-intent",
    title: "Vague intent — ask before search",
    plan: "docs/VAGUE-INTENT-PLAN.md",
    group: "V",
    generator: "generate-vague-intent.mjs",
    smoke: 15,
    extraCriteria: [
      {
        id: "no_premature",
        weight: 2,
        test: (t) => /premature|ask first|vague|zero context|no products/i.test(t),
        note: "No carousel on zero-context messages",
      },
      {
        id: "nothing_found",
        weight: 1,
        test: (t) => /nothing found|clarifying|ask/i.test(t),
        note: "Ask instead of nothing-found on vague",
      },
    ],
  },
  {
    id: "repair-flow",
    title: "Relationship repair & delivery tone",
    plan: "docs/REPAIR-FLOW-PLAN.md",
    group: "W",
    generator: "generate-repair-flow.mjs",
    smoke: 15,
    extraCriteria: [
      {
        id: "no_hand_deliver",
        weight: 2,
        test: (t) => /hand.?deliver|pick up yourself|preach/i.test(t),
        note: "Never preach DIY delivery over Kapruka",
      },
      {
        id: "kapruka_delivery",
        weight: 1,
        test: (t) => /deliver|send|Kapruka|machang/i.test(t),
        note: "Offer Kapruka delivery as the solution",
      },
    ],
  },
  {
    id: "breakup-repair",
    title: "Breakup hand-deliver + real bouquets (multilingual)",
    plan: "docs/BREAKUP-REPAIR-PLAN.md",
    group: "Y",
    generator: "generate-breakup-repair.mjs",
    smoke: 30,
    extraCriteria: [
      {
        id: "breakup_hand_deliver",
        weight: 2,
        test: (t) => /hand.?deliver|ship to you|Aiyo|note card|challenge/i.test(t),
        note: "Breakup flowers → Kapruka-to-you hand-deliver story",
      },
      {
        id: "flower_junk_filter",
        weight: 2,
        test: (t) => /banana flower|hair clip|bouquet|FLOWER_JUNK|real bouquet/i.test(t),
        note: "Real bouquet filter — no grocery junk",
      },
      {
        id: "multilingual_y",
        weight: 1,
        test: (t) => /en.*si.*ta|multilingual|sinhala|tamil|500/i.test(t),
        note: "Three-language persona coverage",
      },
      {
        id: "anti_hand_deliver",
        weight: 2,
        test: (t) => /anti.?hand.?deliver|don't tell me|karamu beda|venam illa/i.test(t),
        note: "Anti-hand-deliver traps in all languages",
      },
    ],
  },
  {
    id: "one-tap-reorder",
    title: "One-tap reorder habit (CEO priority)",
    plan: "docs/REORDER-PLAN.md",
    group: "X",
    generator: "generate-reorder-habit.mjs",
    smoke: 15,
    extraCriteria: [
      {
        id: "one_tap_ui",
        weight: 2,
        test: (t) => /one tap|Order this again|post-checkout|Welcome back|button/i.test(t),
        note: "Primary UI reorder surface, not chat-only",
      },
      {
        id: "checkout_prefill",
        weight: 2,
        test: (t) => /pre-fill|prefill|skip.*recipient|delivery fields|checkout review/i.test(t),
        note: "Checkout prefill on reorder",
      },
      {
        id: "track_to_pay",
        weight: 1,
        test: (t) => /Track.*pay|OrderTracker|review \+ pay|not add-to-cart|not cart-only/i.test(t),
        note: "Tracking reorder goes to checkout, not cart detour",
      },
      {
        id: "phase2_deferred",
        weight: 1,
        test: (t) => /Phase 2|deferred|Supabase|explicitly deferred/i.test(t),
        note: "Account/history scoped as Phase 2, v1 shippable without auth",
      },
    ],
  },
];

export function criteriaForDomain(domain) {
  return [...BASE_CRITERIA, ...(domain.extraCriteria ?? [])];
}

export function getDomain(id) {
  const d = DOMAINS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown domain: ${id}`);
  return d;
}
