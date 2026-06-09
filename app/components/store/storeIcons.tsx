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

export function formatLKR(price: number, currency = "LKR"): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
