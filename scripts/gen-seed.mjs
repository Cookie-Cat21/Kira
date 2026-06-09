// Generates data/seed-catalog.json — a realistic offline fallback catalog so the
// storefront renders fully before a live MCP sync runs. No network required.
// Run: node scripts/gen-seed.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/seed-catalog.json");

const CATEGORIES = [
  { slug: "cakes", name: "Cakes & Bakery", icon: "CakeSlice", blurb: "Freshly baked, delivered islandwide", rank: 1 },
  { slug: "flowers", name: "Flowers", icon: "Flower2", blurb: "Hand-tied bouquets & arrangements", rank: 2 },
  { slug: "chocolates", name: "Chocolates", icon: "Gift", blurb: "Imported & local indulgence", rank: 3 },
  { slug: "hampers", name: "Gift Hampers", icon: "Package", blurb: "Curated boxes for every occasion", rank: 4 },
  { slug: "electronics", name: "Electronics", icon: "Smartphone", blurb: "Phones, audio & gadgets", rank: 5 },
  { slug: "grocery", name: "Grocery", icon: "ShoppingBasket", blurb: "Weekly essentials & pantry", rank: 6 },
  { slug: "kids", name: "Kids & Toys", icon: "Baby", blurb: "Soft toys, games & gifts", rank: 7 },
  { slug: "home", name: "Home & Lifestyle", icon: "Home", blurb: "Décor, kitchen & living", rank: 8 },
];

// name templates + base price ranges (LKR) per category
const ITEMS = {
  cakes: [
    ["Ribbon Chocolate Gateau", 3950], ["Classic Butter Cake 1kg", 2400],
    ["Red Velvet Cream Cake", 4600], ["Fresh Fruit Gateau", 4200],
    ["Dark Chocolate Truffle Cake", 5200], ["Vanilla Sponge with Berries", 3600],
    ["Coffee Mocha Layer Cake", 4800], ["Birthday Confetti Cake", 4400],
  ],
  flowers: [
    ["Red Rose Bouquet (12)", 5500], ["White Lily Arrangement", 6200],
    ["Mixed Seasonal Bouquet", 4800], ["Sunflower Bunch", 4200],
    ["Orchid Vase Arrangement", 7800], ["Pastel Carnation Box", 5100],
    ["Anthurium Tropical Bunch", 5900], ["Pink Rose & Baby's Breath", 5300],
  ],
  chocolates: [
    ["Ferrero Rocher T16", 2900], ["Lindt Lindor Assorted 200g", 3400],
    ["Toblerone Gift Pack", 2600], ["Cadbury Celebrations Box", 1800],
    ["Lindt Excellence Dark 70%", 1200], ["Kapruka Signature Chocolate Box", 3900],
    ["Hazelnut Praline Selection", 4300], ["Belgian Truffle Hamper", 5600],
  ],
  hampers: [
    ["Deluxe Tea & Treats Hamper", 8900], ["Wine & Cheese Gift Box", 12500],
    ["Breakfast in Bed Hamper", 7400], ["Pamper & Spa Gift Set", 9800],
    ["Festive Celebration Hamper", 14200], ["Gourmet Snack Box", 6300],
    ["New Baby Gift Hamper", 8100], ["Anniversary Luxe Hamper", 15600],
  ],
  electronics: [
    ["Wireless Earbuds Pro", 9900], ["Bluetooth Speaker Mini", 6500],
    ["Smart Fitness Band", 7800], ["20000mAh Power Bank", 4900],
    ["USB-C Fast Charger 65W", 3600], ["Over-Ear Headphones", 12400],
    ["Webcam 1080p", 5400], ["Mechanical Keyboard", 11800],
  ],
  grocery: [
    ["Ceylon Black Tea 400g", 1150], ["Basmati Rice 5kg", 4200],
    ["Pure Bee Honey 500g", 1850], ["Virgin Coconut Oil 1L", 1650],
    ["Cashew Nuts 250g", 2400], ["Red Lentils 1kg", 720],
    ["Cinnamon Sticks 100g", 980], ["Assorted Biscuit Pack", 1320],
  ],
  kids: [
    ["Plush Teddy Bear 40cm", 3800], ["Building Blocks 120pc", 4500],
    ["Soft Bunny Rattle", 1900], ["Wooden Puzzle Set", 2700],
    ["Remote Control Car", 5900], ["Story Book Bundle", 2300],
    ["Stacking Rings Toy", 1600], ["Art & Craft Kit", 3100],
  ],
  home: [
    ["Scented Soy Candle Set", 3200], ["Ceramic Mug Pair", 2100],
    ["Cotton Throw Blanket", 4800], ["Bamboo Cutting Board", 2600],
    ["LED Desk Lamp", 5300], ["Photo Frame Set of 3", 2900],
    ["Aroma Diffuser", 4600], ["Stoneware Dinner Set", 8700],
  ],
};

const summaries = {
  cakes: "Baked fresh to order and delivered cool. 24h notice for islandwide delivery.",
  flowers: "Hand-arranged by florists and delivered same-day in Colombo.",
  chocolates: "Sealed, gift-ready and perfect for any occasion.",
  hampers: "Thoughtfully curated and presented in premium packaging.",
  electronics: "Genuine stock with warranty. Ships within 1–2 days.",
  grocery: "Pantry staples and Sri Lankan favourites, quality assured.",
  kids: "Safe, age-appropriate and loved by little ones.",
  home: "Elevate everyday living with considered design.",
};

const products = [];
for (const cat of CATEGORIES) {
  const list = ITEMS[cat.slug] ?? [];
  list.forEach(([name, price], i) => {
    const id = `${cat.slug}-${String(i + 1).padStart(2, "0")}`;
    const featured = i < 3;
    const compareAt = i % 3 === 0 ? Math.round((price * 1.18) / 10) * 10 : undefined;
    products.push({
      id,
      name,
      summary: summaries[cat.slug],
      description: `${name} — ${summaries[cat.slug]}`,
      price,
      currency: "LKR",
      compareAtPrice: compareAt,
      image: undefined, // gradient placeholder until live sync brings Kapruka imagery
      images: [],
      category: cat.name,
      categorySlug: cat.slug,
      url: undefined,
      inStock: true,
      stockLevel: i % 5 === 0 ? "Low stock" : "In stock",
      variants: [],
      addons: [],
      attributes: {},
      isFeatured: featured,
      rank: i,
    });
  });
  cat.productCount = list.length;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ categories: CATEGORIES, products }, null, 2));
console.log(`Wrote ${products.length} products across ${CATEGORIES.length} categories → ${OUT}`);
