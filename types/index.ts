export interface KiraProduct {
  id: string;
  name: string;
  price: number;
  currency?: string;
  image?: string;
  summary?: string;
  category?: string;
  url?: string;
  inStock?: boolean;
  stockLevel?: string;
  badges?: string[];
  deliveryInfo?: DeliveryQuote;
}

export interface KiraProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  currency?: string;
  inStock?: boolean;
  stockLevel?: string;
  attributes?: Record<string, string>;
}

export interface ProductShipping {
  shipsFrom?: string;
  shipsInternationally?: boolean;
  restrictedCountries?: string[];
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  currency?: string;
}

export interface KiraProductDetails extends KiraProduct {
  description?: string;
  images: string[];
  compareAtPrice?: number;
  variants: KiraProductVariant[];
  addons?: ProductAddon[];
  attributes?: Record<string, string>;
  shipping?: ProductShipping;
  isCategoryStub?: boolean;
}

export interface DeliveryQuote {
  available: boolean;
  city: string;
  checkedDate?: string;
  estimatedDate?: string;
  nextAvailableDate?: string;
  reason?: string;
  fee?: number;
  currency?: string;
  perishable?: boolean;
  perishableWarning?: string;
}

export interface TrackingEvent {
  status: string;
  label: string;
  time?: string;
  done: boolean;
}

export interface TrackingItem {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice?: number;
}

export interface OrderTracking {
  orderNumber: string;
  currentStatus: string;
  statusDisplay?: string;
  orderDate?: string;
  deliveryDate?: string;
  timeline: TrackingEvent[];
  liveTrackingAvailable?: boolean;
  hasDeliveryVideo?: boolean;
  hasDeliveryPhoto?: boolean;
  items?: TrackingItem[];
}

export interface CheckoutInfo {
  checkoutUrl: string;
  orderRef?: string;
  summary?: {
    itemsTotal?: number;
    deliveryFee?: number;
    addonsTotal?: number;
    grandTotal?: number;
    currency?: string;
  };
  expiresAt?: string;
}

export interface KiraMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: KiraProduct[];
  deliveryInfo?: DeliveryQuote;
  payLink?: string;
  checkout?: CheckoutInfo;
  tracking?: OrderTracking;
  timestamp: number;
  thinkingMs?: number;
  steps?: string[];          // actual tool steps that fired during this turn
  thinkingSummary?: string;  // AI-generated one-liner summary of the tool batch
  suggestions?: string[];    // post-search contextual chips from SSE
}

export interface CartItem {
  product: KiraProduct;
  quantity: number;
}

export interface LastOrder {
  orderRef?: string;
  items: CartItem[];
  recipient?: { name: string; phone: string };
  delivery?: { city: string; address: string; date?: string };
  giftMessage?: string;
  senderName?: string;
  label?: string;
  placedAt: number;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
  deliveryDate?: string;
  budget?: string;
  occasion?: string;
  recipient?: string;
  lastProducts?: KiraProduct[];
  shownProducts?: KiraProduct[];
  lastOrder?: LastOrder;
  language?: "en" | "si" | "ta";
  internationalMode?: boolean;
}

export interface ChatResponse {
  message: string;
  products?: KiraProduct[];
  deliveryInfo?: DeliveryQuote;
  payLink?: string;
  checkout?: CheckoutInfo;
  tracking?: OrderTracking;
}
