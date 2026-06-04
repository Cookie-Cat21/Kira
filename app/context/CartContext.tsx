"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  motion,
  useAnimation,
} from "framer-motion";
import type { CartItem, KiraProduct } from "@/types";

interface FlyItemData {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  imageUrl: string;
}

interface CartContextValue {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isOpen: boolean;
  payLink?: string;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: KiraProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setPayLink: (payLink?: string) => void;
  triggerFly: (rect: DOMRect, imageUrl: string) => void;
  cartButtonRef: RefObject<HTMLButtonElement | null>;
  bagControls: ReturnType<typeof useAnimation>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

function FlyingItem({
  data,
  onDone,
}: {
  data: FlyItemData;
  onDone: () => void;
}) {
  const size = 48;
  const x0 = data.fromX - size / 2;
  const y0 = data.fromY - size / 2;
  const x1 = data.toX - size / 2;
  const y1 = data.toY - size / 2;
  const cx = (x0 + x1) / 2;
  const cy = Math.min(y0, y1) - 140;
  const points = Array.from({ length: 21 }, (_, i) => i / 20);
  const xPath = points.map(
    (t) => (1 - t) ** 2 * x0 + 2 * t * (1 - t) * cx + t ** 2 * x1
  );
  const yPath = points.map(
    (t) => (1 - t) ** 2 * y0 + 2 * t * (1 - t) * cy + t ** 2 * y1
  );

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[200] overflow-hidden rounded-full border-2 border-kap-purple bg-white shadow-lg"
      style={{ width: size, height: size }}
      initial={{ x: x0, y: y0, scale: 1, opacity: 1 }}
      animate={{
        x: xPath,
        y: yPath,
        scale: points.map((t) => 1 - t * 0.6),
        opacity: points.map((t) => (t < 0.78 ? 1 : 1 - (t - 0.78) / 0.22)),
      }}
      transition={{ duration: 0.55, ease: "easeIn", times: points }}
      onAnimationComplete={onDone}
    >
      <Image
        src={data.imageUrl}
        alt=""
        fill
        sizes="48px"
        className="object-cover"
      />
    </motion.div>
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [payLink, setPayLink] = useState<string | undefined>();
  const [flyItems, setFlyItems] = useState<FlyItemData[]>([]);
  const flyCounter = useRef(0);
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  const bagControls = useAnimation();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const addToCart = useCallback((product: KiraProduct) => {
    setPayLink(undefined);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (!existing) return [...prev, { product, quantity: 1 }];
      return prev.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setPayLink(undefined);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQty = useCallback(
    (productId: string, qty: number) => {
      setPayLink(undefined);
      if (qty <= 0) {
        removeFromCart(productId);
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: qty } : item
        )
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setPayLink(undefined);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const triggerFly = useCallback((sourceRect: DOMRect, imageUrl: string) => {
    const targetRect = cartButtonRef.current?.getBoundingClientRect();
    const toX = targetRect
      ? targetRect.left + targetRect.width / 2
      : window.innerWidth - 32;
    const toY = targetRect ? targetRect.top + targetRect.height / 2 : 32;

    setFlyItems((prev) => [
      ...prev,
      {
        id: ++flyCounter.current,
        fromX: sourceRect.left + sourceRect.width / 2,
        fromY: sourceRect.top + sourceRect.height / 2,
        toX,
        toY,
        imageUrl,
      },
    ]);
  }, []);

  const handleFlyDone = useCallback(
    (id: number) => {
      setFlyItems((prev) => prev.filter((item) => item.id !== id));
      void bagControls.start({
        scale: [1, 1.35, 0.92, 1.08, 1],
        rotate: [-5, 5, -2, 0],
        transition: { duration: 0.38, ease: "easeOut" },
      });
    },
    [bagControls]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      cartCount,
      cartTotal,
      isOpen,
      payLink,
      openCart,
      closeCart,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
      setPayLink,
      triggerFly,
      cartButtonRef,
      bagControls,
    }),
    [
      addToCart,
      bagControls,
      cart,
      cartCount,
      cartTotal,
      clearCart,
      closeCart,
      isOpen,
      openCart,
      payLink,
      removeFromCart,
      triggerFly,
      updateQty,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      <AnimatePresence>
        {flyItems.map((data) => (
          <FlyingItem
            key={data.id}
            data={data}
            onDone={() => handleFlyDone(data.id)}
          />
        ))}
      </AnimatePresence>
      {children}
    </CartContext.Provider>
  );
}
