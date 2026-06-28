import {
  CakeSlice,
  Flower2,
  Gift,
  Package,
  Smartphone,
  ShoppingBasket,
  Baby,
  Home,
  Sparkles,
} from "lucide-react";
import type { ComponentType } from "react";

type IconCmp = ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<string, IconCmp> = {
  CakeSlice,
  Flower2,
  Gift,
  Package,
  Smartphone,
  ShoppingBasket,
  Baby,
  Home,
};

export function categoryIcon(name?: string): IconCmp {
  return (name && CATEGORY_ICONS[name]) || Sparkles;
}

const KNOWN_PH = new Set([
  "cakes",
  "flowers",
  "chocolates",
  "hampers",
  "electronics",
  "grocery",
  "kids",
  "home",
]);

export function phClass(slug?: string): string {
  return slug && KNOWN_PH.has(slug) ? `ph-${slug}` : "ph-default";
}

const BADGE_LABELS: Record<string, string> = {
  cakes: "CAKE",
  flowers: "FLOWERS",
  hampers: "HAMPER",
  chocolates: "CHOC",
  plants: "PLANT",
  candles: "CANDLE",
  electronics: "TECH",
  grocery: "GROCERY",
  kids: "KIDS",
  home: "HOME",
};

export function categoryBadgeLabel(
  category?: string,
  categorySlug?: string
): string {
  const key = (categorySlug ?? category ?? "").toLowerCase();
  if (BADGE_LABELS[key]) return BADGE_LABELS[key];
  const fromName = (category ?? "").trim();
  if (!fromName) return "GIFT";
  return fromName.length <= 8 ? fromName.toUpperCase() : "GIFT";
}

export function formatLKR(price: number, currency = "LKR"): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
