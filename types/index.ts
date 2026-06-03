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
}

export interface KiraMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: KiraProduct[];
  deliveryInfo?: DeliveryQuote;
  payLink?: string;
  timestamp: number;
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
