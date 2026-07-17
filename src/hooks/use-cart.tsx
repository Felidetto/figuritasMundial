"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types";
import { generateCartId } from "@/lib/tokens";

const STORAGE_KEY = "laminas2026_cart";

interface CartContextValue {
  items: CartItem[];
  totalQty: number;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (stickerId: string) => void;
  setQty: (stickerId: string, qty: number, maxQty: number) => void;
  clearCart: () => void;
  removeUnavailable: (stickerIds: string[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  if (!localStorage.getItem("laminas2026_cart_id")) {
    localStorage.setItem("laminas2026_cart_id", generateCartId());
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hidratación desde localStorage — patrón estándar client-only
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación inicial desde localStorage
    setItems(loadCart());
    setHydrated(true);
  }, []);

  const totalQty = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  const updateItems = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "qty"> & { qty?: number }) => {
      updateItems((prev) => {
        const existing = prev.find((i) => i.stickerId === item.stickerId);
        if (existing) {
          const newQty = Math.min(existing.qty + (item.qty ?? 1), item.maxQty);
          if (newQty <= 0) return prev.filter((i) => i.stickerId !== item.stickerId);
          return prev.map((i) =>
            i.stickerId === item.stickerId ? { ...i, qty: newQty, maxQty: item.maxQty } : i,
          );
        }
        return [...prev, { ...item, qty: Math.min(item.qty ?? 1, item.maxQty) }];
      });
    },
    [updateItems],
  );

  const removeItem = useCallback(
    (stickerId: string) => updateItems((prev) => prev.filter((i) => i.stickerId !== stickerId)),
    [updateItems],
  );

  const setQty = useCallback(
    (stickerId: string, qty: number, maxQty: number) => {
      updateItems((prev) => {
        if (qty <= 0) return prev.filter((i) => i.stickerId !== stickerId);
        return prev.map((i) =>
          i.stickerId === stickerId ? { ...i, qty: Math.min(qty, maxQty), maxQty } : i,
        );
      });
    },
    [updateItems],
  );

  const clearCart = useCallback(() => updateItems(() => []), [updateItems]);

  const removeUnavailable = useCallback(
    (stickerIds: string[]) =>
      updateItems((prev) => prev.filter((i) => !stickerIds.includes(i.stickerId))),
    [updateItems],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalQty,
        hydrated,
        addItem,
        removeItem,
        setQty,
        clearCart,
        removeUnavailable,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
