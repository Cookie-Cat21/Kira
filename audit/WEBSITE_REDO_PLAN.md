# Kapruka Full Website Redo — Flow Map

**Vision:** Replace legacy kapruka.com with an AI-native 2026 experience. The Agent Challenge scores the **chatbot** — we over-deliver by redoing every major flow with Kira integrated, not bolted on.

**Audit source:** `/audit/kapruka-current/NOTES.md` + live site screenshots (Jun 2026)

---

## Legacy Kapruka vs Kira Redo

| Legacy flow | Legacy pain | Kira redo route | Integration |
|-------------|-------------|-----------------|-------------|
| Homepage category wall | 12+ icons, no intent | `/shop` GiftFinder hero | Opens Kira with composed prompt |
| Catalog browse | SEO wall + 20 categories | `/shop` rails + `/shop/[slug]` | Category banner → Ask Kira |
| Product detail | Buried delivery info | `/product/[id]` | Ask Kira + fly-to-cart |
| Search | Generic SEARCH PRODUCTS | StoreNav search + Kira fallback | "No matches — ask Kira" |
| Cart / checkout | Multi-page form | CartDrawer + CheckoutModal | Shared with chat |
| Order tracking | Buried in Contact Us | `/track` | Form + "ask Kira" link |
| Full concierge | N/A | `/` full-screen Kira | Challenge primary surface |

---

## Page architecture

```
/                 → Full-screen Kira (challenge primary)
/shop             → Intent-first storefront (GiftFinder hero)
/shop/[slug]      → Category grid + Kira category banner
/product/[id]     → Cinematic PDP + Ask Kira
/track            → Order tracking (replaces orderStatus.jsp)
/kira             → Redirect → /
```

---

## Flow 1: Gift discovery (replaces homepage)

**Legacy:** Category icons → guess → search → PDP → cart  
**Redo:**

1. Land `/shop` → GiftFinder: occasion + recipient + city + budget
2. Tap **Find gifts with Kira** → dock opens with full intent prompt
3. Kira searches MCP → product carousel → delivery → cart → checkout
4. Or: browse editorial rails / categories as secondary path

---

## Flow 2: Browse catalog (replaces deliveryCatalogCompact)

**Legacy:** 125k products paragraph + category matrix  
**Redo:**

1. `/shop/[slug]` — filtered grid, sort, load-more
2. Sticky Kira banner: "Not sure? Ask Kira to pick from {category}"
3. Product card → PDP or Ask Kira about this item

---

## Flow 3: Product → cart → checkout

**Legacy:** Add-ons on PDP, separate checkout pages  
**Redo:**

1. PDP — delivery trust row, add to tray (fly animation)
2. CartDrawer — gift message field, delivery summary
3. CheckoutModal — MCP order + pay link
4. Mirror path in Kira chat (same cart)

---

## Flow 4: Order tracking (replaces orderStatus.jsp)

**Legacy:** 12-digit field inside marketing shell + duplicate WhatsApp CTAs  
**Redo:**

1. `/track` — single-purpose page, large input, example format
2. Submit → opens Kira with `track order KP…` OR inline timeline via API
3. Footer + nav link to Track

---

## Flow 5: Diaspora sender

**Legacy:** USD on some products, office contacts in footer  
**Redo:**

1. TrustBar: "Sending from overseas? Kira quotes LKR + delivery to Sri Lanka"
2. Kira international mode in chat
3. Footer: USA / UK / AUS support links (static)

---

## What we deliberately avoid (from audit)

- Giant category walls above fold
- SEO paragraphs before UI
- Repeated competing CTAs (one primary Kira entry per viewport)
- Truncated mobile category labels
- Tracking buried in marketing chrome

---

## Implementation status

| Item | Status |
|------|--------|
| GiftFinder hero | In progress |
| TrustBar | In progress |
| OccasionStrip | In progress |
| `/track` page | In progress |
| Category Kira banner | In progress |
| Store nav/footer links | In progress |
| PDP polish | Existing |
| Full-screen Kira `/` | Done |
