# Kira → Full Website Replacement Analysis

**Audit date:** 2026-06-08  
**Source:** Playwright headless crawl of kapruka.com + screenshots + MCP API knowledge  
**Goal:** Identify every website capability Kira doesn't yet cover, ranked by user impact.

---

## What the website actually does (full feature inventory)

### Navigation surface
| Feature | Website | Kira today |
|---|---|---|
| Full-text product search bar | ✅ Top of every page | ✅ via kapruka_search_products |
| Category mega-menu (20 departments) | ✅ | Partial — no explicit category browse flow |
| Father's Day / seasonal tab | ✅ curated carousel | Partial — occasion keywords handled |
| **Rush delivery tab** | ✅ dedicated filter | ❌ missing entirely |
| On Sale / discounts tab | ✅ | ❌ missing |
| Events tab (curated occasion pages) | ✅ | ❌ missing |
| Brands tab (shop by brand) | ✅ | ❌ Kira can't filter by brand |
| "For You" personalized recs | ✅ | ❌ no personalization |
| Language switcher (EN/Tamil/Sinhala) | ✅ | ✅ Kira mirrors user language |

### Product page
| Feature | Website | Kira today |
|---|---|---|
| Product images (multi) | ✅ | ✅ ProductCard shows image |
| Price in LKR | ✅ | ✅ |
| Add-on upsells on product page ("Add icing greeting Rs 160") | ✅ shown before cart | ❌ Kira never surfaces add-ons |
| Lead-time warning ("24hrs notice required") | ✅ red banner | ❌ Kira only warns on perishable, not lead-time |
| "You Might Also Want These…" cross-sell row | ✅ flowers+cake, teddy+cake | Partial — Kira upsells verbally but no structured cross-sell |
| Similar products (same item, different sizes) | ✅ 8 size variants shown | ❌ Kira can't surface size variants |
| Product tabs: Details / Q&A / Reviews | ✅ | ❌ Kira never mentions reviews/ratings |
| "Similar products" from same bakery | ✅ | ❌ no brand-level "show me more from BreadTalk" flow |
| Payment methods shown pre-cart | ✅ card icons | ❌ Kira doesn't communicate payment options |

### Cart & checkout
| Feature | Website | Kira today |
|---|---|---|
| Multi-item cart with running total | ✅ | ✅ Kira tracks cart in state |
| Coupon/promo code field | ✅ | ❌ missing |
| Guest checkout | unclear (Cloudflare blocked) | Kira creates orders without account |
| Icing/greeting add-on at product page | ✅ | ❌ |
| Recipient details form | ✅ full form | ✅ Kira collects conversationally |
| Delivery date picker | ✅ calendar widget | ✅ Kira asks for date |
| Delivery city dropdown | ✅ | ✅ Kira handles city |
| Gift message field | at checkout | ✅ Kira handles gift message |
| Total cost breakdown (items + delivery) | ✅ | ✅ Kira previews total before order |
| Payment gateway (card/online banking) | ✅ on-site payment | ✅ Kira emits payLink |

### Account & reorder ← **biggest gap for Dulith's ask**
| Feature | Website | Kira today |
|---|---|---|
| Order history | ✅ /myorders | ❌ Kira has no account concept |
| **Reorder ("buy again")** | ✅ one-click reorder | ❌ completely missing |
| Saved delivery addresses | ✅ | ❌ |
| Wishlist | likely | ❌ |
| Loyalty points / rewards | likely | ❌ |
| Gift reminder service (birthday/anniversary) | ✅ /giftreminder | ❌ Kira can't create reminders |

### International / diaspora
| Feature | Website | Kira today |
|---|---|---|
| USD/AUD/GBP pricing shown | ✅ homepage shows USD | ❌ Kira only quotes LKR |
| USA / UK / AUS office contacts | ✅ in footer | ❌ |
| International sender flow | ✅ implied by offices | ❌ Kira assumes local sender |

### Value-added services
| Feature | Website | Kira today |
|---|---|---|
| Custom printed cakes (photo upload) | ✅ multi-step wizard | ❌ |
| Customised/personalised gifts category | ✅ | Partial — Kira can search but no personalisation flow |
| Hotel restaurant food delivery (Galadari, etc.) | ✅ | ✅ MCP covers it |
| Mobile phone reload | ✅ /services | ❌ out of Kira's lane |
| Send Money / Vouchers | ✅ | ❌ |
| Real estate services | ✅ | ❌ out of scope |
| Horoscope reading | ✅ | ❌ |
| WhatsApp support (1297) | ✅ | ❌ Kira doesn't mention it |
| Mobile app (iOS + Android) | ✅ | ❌ |
| Email newsletter signup | ✅ "Join the Happy Crowd" | ❌ |

### Catalog coverage Kira doesn't explicitly handle
From the homepage category grid (20 departments):
- Fruits & hampers
- Soft Toys & Kids
- Grocery & Hampers (full supermarket with 25+ subcategories)
- Greeting Cards & Party Supplies
- Sports & Bicycles
- Mother & Baby
- Jewellery & Watches
- Health & Wellness
- Home & Lifestyle
- Books & Stationery
- Automobiles
- Pet Care
- Intimate Essentials
- Made in Sri Lanka (curated local brands)
- Kapruka Global Shop (imported goods)
- Wine & Spirits
- Religious Items
- Combo & Gift Sets (dedicated category)

---

## Prioritised improvements for Kira

### Tier 1 — High impact, achievable within the current MCP toolset

#### 1. Reorder flow (Dulith's #1 ask)
**What the site does:** /myorders page lets logged-in users see past orders and click "reorder."  
**Gap:** Kira has zero account/session memory.  
**How to bridge within current constraints:**
- During a session, after a successful order, Kira says: *"Saved this order — next time just say 'order again' and I'll queue it up."*
- Store the last cart as `lastOrder` in client state (same pattern as `lastProducts`).
- Add a deterministic fast-path in `route.ts`: `REORDER_RE = /order again|same as last|reorder|what i had|same thing/i` → re-emit `lastOrder` to cart.
- For cross-session reorder: expose a "reference code" to the user (the Kapruka order ref from `CheckoutInfo.orderRef`) so they can say "reorder KP-12345" and Kira can pull it via `kapruka_track_order` → rebuild cart from `tracking.items`.

**Effort:** 2–3 hours. Pure prompt + route.ts change, no MCP changes needed.

#### 2. Baker/brand filtering for cakes
**What the site does:** 20 bakery brand sub-pages (Hilton, Shangri-La, BreadTalk, Galadari, Java Lounge, etc.).  
**Gap:** Kira searches generically. "Hilton cake" might work by luck, but there's no explicit flow.  
**How to bridge:**
- Add a `BAKERY_BRANDS` map in route.ts: `{ hilton: "colombo hilton", "shangri-la": "shangri-la", breadtalk: "breadtalk", galadari: "galadari", "java lounge": "java", ... }`
- Fast-path: if message contains a known brand name + "cake", pass `brand:` filter or append brand to search query.
- In prompt: *"If the user names a specific hotel or bakery (Hilton, BreadTalk, Java Lounge, Galadari, Shangri-La, Kingsbury, Cinnamon), filter the search by that bakery."*

**Effort:** 1–2 hours. Deterministic fast-path + prompt addition.

#### 3. Add-on surfacing ("Add icing greeting")
**What the site does:** On the product page, shows "Add icing greeting (Rs 160)" as a pre-cart upsell.  
**Gap:** Kira never mentions add-ons.  
**How to bridge:**
- `kapruka_get_product` likely returns add-ons in its response — check what `ProductQuickView` receives.
- In `extractProductsFromMcp` or the QuickView endpoint, surface `addons` array.
- Prompt rule: *"After confirming a cake, check if the product has add-ons (icing message, candles, etc.) — offer them: 'Want to add an icing message? It's LKR 160 extra.'"*

**Effort:** 2–3 hours. MCP response parsing + prompt section.

#### 4. Rush / same-day delivery awareness
**What the site does:** Dedicated "Rush delivery" nav tab — filters to products deliverable today.  
**Gap:** Kira can check delivery availability, but never routes users to the "I need it TODAY" fast lane.  
**How to bridge:**
- Add `RUSH_RE = /today|urgent|asap|rush|same.?day|right now/i` fast-path.
- When triggered, pass `sort:"price_asc"` + note in system context that user needs same-day — check delivery with today's date and surface only `available: true` results.
- Prompt: *"'I need it today / ASAP / urgent' → search with today's date, call check_delivery immediately, only show products where available is true."*

**Effort:** 1 hour. One fast-path + prompt rule.

#### 5. International sender support (diaspora)
**What the site does:** Shows USD/AUD/GBP prices, has USA/UK/AUS contact offices — clearly targets Sri Lankan diaspora sending gifts home.  
**Gap:** Kira assumes a local LKR sender. No currency handling, no "I'm calling from London" context.  
**How to bridge:**
- Add currency detection: if user mentions AUS/UK/US/overseas/dollars/pounds, set `internationalMode: true` in `ChatRequest`.
- Convert LKR prices to approximate USD/AUD at a fixed rate for display: *"That's about USD 12 (LKR 3,600)"*.
- Prompt section: *"If the user says they're overseas (UK, US, Australia, UAE, etc.), quote prices in both LKR and approximate USD. Reassure them: 'Kapruka delivers islandwide from Colombo — I just need the recipient's Sri Lanka address.'"*

**Effort:** 2–3 hours. ChatRequest field + prompt section + price display logic.

#### 6. Combo / hamper / gift set explicit flow
**What the site does:** "Combo and Gift Sets" is a dedicated top-level category.  
**Gap:** Kira has `GIFT_INTENT_RE` but doesn't specifically route to combos/hampers.  
**How to bridge:**
- Add `HAMPER_RE = /hamper|gift set|combo|gift box|basket/i` fast-path that searches `q:"gift set"` or `category:"combogifts"`.
- In prompt: *"'hamper', 'gift set', 'combo pack', 'basket' → search category:combogifts directly."*

**Effort:** 30 mins. One regex + one prompt line.

#### 7. Occasion/sale collection awareness
**What the site does:** "Father's Day Offers", "On Sale", "Events" tabs surface curated seasonal collections.  
**Gap:** Kira knows about occasions but can't surface a curated sale page.  
**How to bridge:**
- When user asks "what's good for Father's Day" or "anything on sale", Kira searches with `sort:"bestseller"` + occasion keyword — this already partially works.
- Add `SALE_RE = /sale|discount|offer|cheap|deal/i` → search with `sort:"price_asc"`.
- Prompt: *"'on sale', 'offers', 'discounts', 'deals' → search with sort:price_asc and add a note: 'These are the most budget-friendly picks right now.'"*

**Effort:** 30 mins.

---

### Tier 2 — Requires MCP expansion (ask Dulith's team)

#### 8. Product size/variant selection
**What the site does:** "Similar products" shows 1LB, 2LB, 3LB, 4LB variants of the same cake — user picks size.  
**Gap:** `KiraProductVariant` type exists in `types/index.ts` but Kira never uses it. `kapruka_get_product` returns variants but Kira's ProductQuickView doesn't expose them conversationally.  
**What needs to happen:**
- When user picks a product, QuickView fetches variants — surface them: *"This comes in 1LB (LKR 2,500), 2LB (LKR 4,160), or 3LB (LKR 5,800) — which size?"*
- Requires prompt + ProductQuickView changes.

#### 9. Personalized/custom cake flow
**What the site does:** Multi-step wizard to upload a photo and customise a cake.  
**Gap:** No MCP tool for custom cake creation. This is a hard dependency on Dulith's team exposing it.  
**Conversational workaround for now:**
- Detect `CUSTOM_CAKE_RE = /custom|personaliz|photo|printed|my photo|write.*cake/i`
- Respond: *"For a custom photo cake I'll need to send you to Kapruka's personalisation page — want the link?"* + provide the direct URL.

#### 10. Gift reminder / occasion calendar
**What the site does:** /giftreminder lets users register birthday/anniversary dates to receive reminders.  
**Gap:** No MCP tool for this. Kira can't create reminders.  
**Conversational bridge:**
- Detect reminder intent: `REMINDER_RE = /remind me|remember.*birthday|set.*reminder|don't let me forget/i`
- Respond: *"I can't set reminders yet — but Kapruka's gift reminder service does exactly that. Want me to share the link?"*
- **Pitch to Dulith:** If the MCP adds a `kapruka_set_reminder` tool, Kira can become the full occasion calendar. This is a huge stickiness driver.

#### 11. Coupon / promo code
**What the site does:** Coupon field in cart.  
**Gap:** `kapruka_create_order` schema doesn't include a coupon field.  
**Bridge:** If user mentions a promo code, collect it in conversation and include in `gift_message` or surface a note: *"I'll note your code — enter it at the Kapruka payment page."*

---

### Tier 3 — Out of scope / Kira should redirect gracefully

| Feature | Response |
|---|---|
| Mobile phone reload | "That's in Kapruka Services — I'll link you there." |
| Send money / vouchers | "For vouchers, here's the Kapruka link." |
| Horoscope | "Ha, planets are above my pay grade! 🔮 Can I find you something on Kapruka?" |
| Real estate | "Way above my lane — I'm a shopper! Can I help with a gift?" |
| Grocery weekly shop | Kira CAN do this — but needs a conversational "shopping list" mode |

---

## The one meta-gap: no account/session continuity

Everything above is solvable at the prompt/route level **except reorder and gift reminders**, which both require knowing who the user is across sessions. The website solves this with login. Kira could solve it with:

1. **Order reference codes** — user saves their Kapruka order number, says "reorder KP-12345" next time
2. **A simple "save this for later"** flow that stores the cart as a named shortcut in localStorage on the client
3. **Ask Dulith for a session/auth MCP tool** — if Kapruka exposes `kapruka_get_user_orders(token)`, Kira becomes the full account replacement

The account layer is the one place the website genuinely beats a stateless chat interface. But every other gap — brand filtering, rush delivery, add-ons, combos, international, occasions — is fixable in this codebase today.

---

## Recommended implementation order

| # | Change | File(s) | Time |
|---|---|---|---|
| 1 | Reorder fast-path (within-session + order-ref) | `app/api/chat/route.ts`, `app/page.tsx` | 2–3h |
| 2 | Rush/same-day fast-path | `route.ts`, `lib/kira-prompt.ts` | 1h |
| 3 | Bakery brand filter map | `route.ts`, `kira-prompt.ts` | 1–2h |
| 4 | Hamper/combo fast-path | `route.ts`, `kira-prompt.ts` | 30m |
| 5 | Sale/discount fast-path | `route.ts`, `kira-prompt.ts` | 30m |
| 6 | International sender mode | `types/index.ts`, `route.ts`, `kira-prompt.ts` | 2–3h |
| 7 | Add-on surfacing | `lib/mcp-parsing.ts`, `kira-prompt.ts` | 2–3h |
| 8 | Grace redirect for custom cakes / reminders | `kira-prompt.ts` | 30m |
| **Total** | | | **~10–13 hours** |
