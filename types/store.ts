import type { KiraProduct } from "@/types";

export interface StoreCategory {
  slug: string;
  name: string;
  icon?: string; // lucide icon name
  blurb?: string;
  productCount: number;
}

export interface ProductRail {
  title: string;
  subtitle?: string;
  items: KiraProduct[];
}

export type StoreSort = "featured" | "price_asc" | "price_desc" | "newest";
