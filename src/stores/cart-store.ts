import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GuestCartItem = {
  variantId: string;
  quantity: number;
};

type CartState = {
  items: GuestCartItem[];
  addItem: (variantId: string, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

/**
 * Guest-only cart (localStorage). Logged-in users' carts live in the
 * `carts`/`cart_items` tables instead — see mergeGuestCart, which drains
 * this store into the DB right after login.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (variantId, quantity) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { variantId, quantity }] };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        })),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-storage" },
  ),
);
