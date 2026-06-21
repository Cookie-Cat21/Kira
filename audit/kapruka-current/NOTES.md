# Kapruka Current Website Audit

**Audit date:** 2026-06-21  
**Method:** Playwright headless screenshots at 320 / 375 / 768 / 1024 / 1280px + manual UX teardown  
**Screenshots:** `/audit/kapruka-current/`

---

## A. Page-by-page notes

### 1. Homepage — `https://www.kapruka.com/`

**Screenshots:** `homepage-320.png`, `homepage-375.png`, `homepage-768.png`, `homepage-1024.png`, `homepage-1280.png`

| Dimension | Notes |
|-----------|-------|
| **First impression** | Dense purple header, immediate category overload, Father's Day promo competes with search. Feels like a 2010s marketplace, not a 2026 concierge. |
| **Primary user job** | Find and send a gift quickly — especially diaspora senders buying for Sri Lanka. |
| **Visible CTAs** | Search bar (dominant), hamburger menu, cart, language switcher, Father's Day / Rush / On Sale tabs, 12+ circular category icons, Featured Products carousel. |
| **Navigation** | Hamburger mega-menu + icon grid + seasonal tabs + footer link farm. No intent-first entry ("gift for mom in Colombo"). |
| **Category/search** | Search is prominent but generic ("SEARCH PRODUCTS.."). Categories are a wall of circular icons with truncated labels on mobile ("Soft Toys & …", "Grocery & H…"). |
| **Visual hierarchy** | Header chrome → promo banner → category grid → featured products. Too many layers before any product appears. |
| **Typography** | Mixed serif headings, small caps labels, inconsistent weights. Category labels truncate badly at 320–375px. |
| **Spacing/density** | Extremely dense above the fold on mobile. 4-column icon grid with 3px gaps. |
| **Trust signals** | Kapruka smile logo, "Featured Products", USD pricing for diaspora, WhatsApp channel CTA buried lower. |
| **Mobile responsiveness** | Functional but cramped. Category labels truncate. Header packs 6+ icons into one row. |
| **Checkout/discovery friction** | No guided gift finder. User must self-navigate categories or know what to search. Delivery confidence not visible until deep in PDP. |
| **Accessibility** | Small touch targets in header, truncated text loses meaning, low contrast on some grey body copy. |

---

### 2. Delivery Catalog — `https://www.kapruka.com/shops/deliveryCatalogCompact_wide.jsp`

**Screenshots:** `catalog-320.png`, `catalog-375.png`, `catalog-768.png`, `catalog-1024.png`, `catalog-1280.png`

| Dimension | Notes |
|-----------|-------|
| **First impression** | SEO paragraph about Sri Lanka's e-commerce growth before any shopping UI. Category matrix immediately below. |
| **Primary user job** | Browse the full Kapruka catalog by department. |
| **Visible CTAs** | Same global header. "All on sale categories — choose from over 125,000 online products" heading. Category icon grid. |
| **Navigation** | Breadcrumb (`Home / All Shopping Ca… / Product Catego…`) truncated on mobile. |
| **Category/search** | 20+ circular categories in a grid — Cake Shop, Combo Gift, Chocolates, Clothing, etc. Labels truncate ("Combo Gift …", "Veg & Veg B…"). |
| **Visual hierarchy** | Marketing copy block → category wall. No filtering, sorting, or intent routing. |
| **Typography** | Long purple paragraph in light box — readable but wastes mobile viewport. |
| **Spacing/density** | Category grid is the densest surface on the site. Decision fatigue within 2 scrolls. |
| **Trust signals** | "125,000 online products" stat. No live stock or delivery confidence at catalog level. |
| **Mobile responsiveness** | 4-column grid at 320px makes labels unreadable. |
| **Checkout/discovery friction** | No search filters, no price range, no occasion filter. User must pick a category blind. |
| **Accessibility** | Truncated category names fail WCAG text-understanding. Tiny icons. |

---

### 3. Order Status — `https://www.kapruka.com/contactUs/orderStatus.jsp`

**Screenshots:** `order-status-320.png`, `order-status-375.png`, `order-status-768.png`, `order-status-1024.png`, `order-status-1280.png`

| Dimension | Notes |
|-----------|-------|
| **First impression** | Simple tracking task buried inside full marketing chrome (header, search, WhatsApp promo, footer). |
| **Primary user job** | Check delivery status of an existing order. |
| **Visible CTAs** | "Show My Order Status" button. WhatsApp channel join (appears twice). Global search/cart. |
| **Navigation** | Same heavy header as every page. Tracking form is mid-page after promo block. |
| **Category/search** | N/A — but search bar still present, adding noise. |
| **Visual hierarchy** | WhatsApp promo competes with the actual tracking form. Form itself is clear once found. |
| **Typography** | "Order Tracking Details" in purple serif — clear. Helper text about 12-digit reference is small grey. |
| **Spacing/density** | Generous whitespace around form, but page is long due to chrome. |
| **Trust signals** | Reference number format explained. No sample order state shown. |
| **Mobile responsiveness** | Form is usable. Header still dense. |
| **Checkout/discovery friction** | User must scroll past promos. No conversational "track my package" entry. |
| **Accessibility** | Input is large and tappable. Duplicate WhatsApp CTAs may confuse screen reader order. |

---

### 4. Agent Challenge — `https://www.kapruka.com/contactUs/agentChallenge.html`

**Screenshots:** `agent-challenge-320.png`, `agent-challenge-375.png`, `agent-challenge-768.png`, `agent-challenge-1024.png`, `agent-challenge-1280.png`

| Dimension | Notes |
|-----------|-------|
| **First impression** | Challenge brief inside legacy site shell. Prize: Apple M4 Mac Mini. |
| **Primary user job** | Understand what to build for the Agent Challenge. |
| **Visible CTAs** | Link to MCP docs, submission instructions. |
| **What challenge wants** | Build an AI shopping agent using Kapruka MCP — search, delivery quote, guest checkout, order tracking. Emphasis on real MCP integration, not mock data. |
| **What MCP enables** | 7 tools: search, get product, list categories, list delivery cities, check delivery, create order, track order. 60 req/min, 30 orders/hr. |
| **What Kira should emphasize** | Live catalog proof, delivery confidence, conversational checkout, multilingual (EN/SI/TA), diaspora-friendly, order tracking — all via real MCP calls. |

---

### 5. MCP Portal — `https://mcp.kapruka.com/`

**Screenshots:** `mcp-320.png`, `mcp-375.png`, `mcp-768.png`, `mcp-1024.png`, `mcp-1280.png`

| Dimension | Notes |
|-----------|-------|
| **First impression** | Modern, clean, developer-focused. Stark contrast to kapruka.com. |
| **Primary user job** | Integrate Kapruka into an AI agent. |
| **Visible CTAs** | Copy MCP endpoint, quick-start snippets for Claude/Cursor/ChatGPT. |
| **Visual hierarchy** | Hero → endpoint → quick start → tool reference → rate limits. Excellent. |
| **Typography** | Clean sans-serif, monospace for code. Readable at all breakpoints. |
| **Trust signals** | Rate limits transparent, tool schemas documented, no auth required. |
| **Mobile responsiveness** | Code blocks scroll horizontally. Otherwise excellent. |

---

## B. Flow audit

### 1. Finding a gift (homepage → product → delivery → cart)

1. **Homepage:** User lands on category icon wall or searches generically. No "who, when, where, budget" prompt.
2. **Search/browse:** Must know category name or product keyword. No occasion-based routing.
3. **Product details:** Deep link required; not visible from homepage without clicking a category first.
4. **Delivery check:** Hidden until PDP or checkout. No upfront "can this reach Colombo tomorrow?"
5. **Add to cart:** Standard e-commerce flow after navigating 3–4 pages.

**Friction summary:** 4+ taps before any product detail. No intent capture. Delivery anxiety unresolved until late.

### 2. Browsing large catalog

1. **Start:** `deliveryCatalogCompact_wide.jsp` — SEO paragraph then 20+ categories.
2. **Category overload:** User scans circular icons with truncated labels. No guidance by occasion, recipient, or budget.
3. **Scan fatigue:** 4-column grid at mobile. "Combo Gift …" vs "Combo and …" — ambiguous.
4. **Intent not guided:** No "gift for girlfriend" path. Catalog-first, not intent-first.

### 3. Tracking an order

1. **Start:** Navigate to order status page (buried in Contact Us).
2. **Input:** 12-digit reference number in plain text field.
3. **Friction:** Full site chrome, duplicate WhatsApp promos, no natural language.
4. **Trust:** Format explained but no example. Error states not visible in static audit.
5. **Mobile:** Form works but page is long.

### 4. Understanding Agent Challenge / MCP

- **Challenge wants:** AI-native shopping via MCP — real products, real delivery, real checkout.
- **MCP enables:** Structured tool calls replacing manual navigation.
- **Kira should emphasize:** Conversational intent → live results → delivery confidence → one-tap checkout → tracking. Prove MCP integration visibly (status badge, thinking steps).

---

## C. Legacy UX debt list

- **Homepage:** Category overload above fold; no intent-first gift finder; dense visual hierarchy; truncated mobile labels.
- **Homepage:** Father's Day promo + Rush + On Sale tabs compete with primary search.
- **Catalog page:** Text-heavy SEO paragraph before categories; weak merchandising; no modern filtering.
- **Catalog page:** 125k products claim without guided discovery — paradox of choice.
- **Order status page:** Simple task hidden inside heavy legacy shell; WhatsApp CTA duplicated.
- **Global header:** 6+ icons in one row on mobile; tiny touch targets; search always visible even on utility pages.
- **Mobile:** Dense navigation and category lists create decision fatigue; 4-column grids truncate labels.
- **Typography:** Inconsistent hierarchy between serif headings and small caps.
- **Trust:** Delivery confidence not shown until late in funnel.
- **Diaspora:** USD shown on some products but no conversational currency context.

---

## D. Patterns Kira must avoid

- Giant category walls (12+ icons above fold)
- Dense link farms in footer and nav
- Repeated competing CTAs (WhatsApp ×2, search on utility pages)
- Tiny touch targets in header chrome
- Unclear delivery confidence until checkout
- Support flows buried inside marketing chrome
- Catalog-first thinking instead of intent-first shopping
- Truncated labels that lose meaning on mobile
- SEO paragraphs before interactive content
- Mock product data without MCP proof
