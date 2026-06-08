"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { KiraMessage } from "@/types";

interface QuickRepliesProps {
  messages: KiraMessage[];
  deliveryCity?: string;
  isLoading: boolean;
  onSelect: (text: string) => void;
}

interface Chip {
  label: string;
  value: string;
}

function deriveChips(messages: KiraMessage[], deliveryCity?: string): Chip[] {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const last = assistantMessages[assistantMessages.length - 1];
  if (!last) return [];

  const hasProducts = !!(last.products?.length);
  const hasCheckout = !!(last.checkout || last.payLink);
  const hasTracking = !!last.tracking;
  const hasDelivery = !!last.deliveryInfo;
  const text = last.content.toLowerCase();
  const isFirstReply = assistantMessages.length === 1;

  if (hasTracking) return [];

  if (hasCheckout) {
    // Use the order ref from THIS checkout so "Track this order" resolves without
    // re-asking. Falls back to the generic ask when this turn has no ref, rather
    // than risk a stale ref from a previous/persisted order.
    const orderRef = last.checkout?.orderRef;
    return [
      { label: "Order again", value: "order again" },
      {
        label: "Track this order",
        value: orderRef ? `Track order ${orderRef}` : "I want to track my order",
      },
      { label: "Browse more", value: "Show me more gift options" },
    ];
  }

  if (hasProducts) {
    const chips: Chip[] = [];
    if (hasDelivery || deliveryCity) {
      chips.push({ label: "Ready to checkout", value: "I am ready to checkout" });
    } else {
      chips.push({ label: "Check delivery", value: "Check delivery to Colombo" });
    }
    // Suggest a price filter if products are expensive
    const prices = last.products?.map((p) => p.price) ?? [];
    const maxPrice = Math.max(...prices);
    if (maxPrice > 3000) {
      chips.push({ label: "Under LKR 3,000", value: "Show me options under LKR 3,000" });
    }
    chips.push({ label: "More options", value: "Show me more options like these" });
    return chips;
  }

  // Kira is asking about occasion / recipient
  if (
    text.includes("occasion") || text.includes("celebrating") ||
    text.includes("who is") || text.includes("who are") ||
    text.includes("recipient") || text.includes("for whom")
  ) {
    return [
      { label: "Birthday", value: "It's for a birthday" },
      { label: "Anniversary", value: "It's for an anniversary" },
      { label: "Thank you", value: "I want to say thank you" },
      { label: "Just because", value: "No special occasion, just a gift" },
    ];
  }

  // Kira is asking about budget
  if (
    text.includes("budget") || text.includes("price range") ||
    text.includes("how much") || text.includes("spend")
  ) {
    return [
      { label: "Under LKR 2,000", value: "My budget is under LKR 2,000" },
      { label: "LKR 2–5k", value: "My budget is between LKR 2,000 and 5,000" },
      { label: "LKR 5–10k", value: "My budget is between LKR 5,000 and 10,000" },
      { label: "No limit", value: "Budget is not a concern" },
    ];
  }

  // Kira is asking about delivery city
  if (
    text.includes("which city") || text.includes("deliver to") ||
    text.includes("your city") || text.includes("location")
  ) {
    return [
      { label: "Colombo", value: "Deliver to Colombo" },
      { label: "Kandy", value: "Deliver to Kandy" },
      { label: "Galle", value: "Deliver to Galle" },
      { label: "Other city", value: "I need to deliver somewhere else" },
    ];
  }

  // Kira mentioned cakes
  if (text.includes("cake") || text.includes("bakery") || text.includes("pastry")) {
    return [
      { label: "Chocolate cake", value: "Show me chocolate cakes" },
      { label: "Add flowers", value: "Can I add flowers to my order?" },
      { label: "Under LKR 3,000", value: "Show me cakes under LKR 3,000" },
    ];
  }

  // Kira mentioned flowers
  if (text.includes("flower") || text.includes("bouquet") || text.includes("rose")) {
    return [
      { label: "Red roses", value: "Show me red rose bouquets" },
      { label: "Mixed bouquet", value: "Show me mixed flower bouquets" },
      { label: "Add chocolates", value: "Add chocolates with the flowers" },
    ];
  }

  // Kira mentioned chocolates
  if (text.includes("chocolate") || text.includes("sweet box") || text.includes("candy")) {
    return [
      { label: "Gift box", value: "Show me chocolate gift boxes" },
      { label: "With flowers", value: "Show me chocolates with flowers" },
      { label: "Under LKR 2,000", value: "Show me chocolates under LKR 2,000" },
    ];
  }

  // Kira mentioned tracking / order number
  if (text.includes("track") || text.includes("order number") || text.includes("order id")) {
    return [];
  }

  // Error state — always give a recovery path, never strand the user
  if (
    text.includes("something went wrong") ||
    text.includes("try again") ||
    text.includes("aiyo") ||
    text.includes("couldn't connect") ||
    text.includes("network error")
  ) {
    return [
      { label: "Try again", value: "Can you try that again?" },
      { label: "Browse gifts", value: "Show me popular gifts" },
      { label: "Track order", value: "I want to track my order" },
    ];
  }

  // Opening / first reply — show entry-point categories
  if (isFirstReply || text.includes("what") || text.includes("help") || text.includes("looking for")) {
    return [
      { label: "Birthday gift", value: "I need a birthday gift" },
      { label: "Flowers", value: "I want to send fresh flowers" },
      { label: "Cakes", value: "Show me cakes on Kapruka" },
      { label: "Track order", value: "I want to track my order" },
    ];
  }

  return [];
}

export default function QuickReplies({
  messages,
  deliveryCity,
  isLoading,
  onSelect,
}: QuickRepliesProps) {
  const chips = deriveChips(messages, deliveryCity);
  if (isLoading || chips.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={chips.map((c) => c.label).join(",")}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.22 }}
        className="mb-3 flex flex-nowrap gap-2 overflow-x-auto pl-11 scrollbar-hide"
      >
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onSelect(chip.value)}
            className="glass-chip rounded-full px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:text-white"
          >
            {chip.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
