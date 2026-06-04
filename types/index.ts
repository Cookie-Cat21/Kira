export interface KiraProduct {
  id: string;
  name: string;
  price: number;
  currency?: string;
  image?: string;
  category?: string;
  url?: string;
}

export interface DeliveryQuote {
  available: boolean;
  city: string;
  estimatedDate?: string;
  fee?: number;
  perishable?: boolean;
}

export interface TrackingEvent {
  status: string;
  label: string;
  time?: string;
  done: boolean;
}

export interface OrderTracking {
  orderNumber: string;
  currentStatus: string;
  timeline: TrackingEvent[];
}

export interface KiraMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: KiraProduct[];
  deliveryInfo?: DeliveryQuote;
  payLink?: string;
  tracking?: OrderTracking;
  timestamp: number;
  thinkingMs?: number;
  steps?: string[];          // actual tool steps that fired during this turn
}

export interface CartItem {
  product: KiraProduct;
  quantity: number;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  cart: CartItem[];
  deliveryCity?: string;
}

export interface ChatResponse {
  message: string;
  products?: KiraProduct[];
  deliveryInfo?: DeliveryQuote;
  payLink?: string;
}
