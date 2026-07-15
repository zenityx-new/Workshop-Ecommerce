"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";
import { mergeGuestCart } from "@/lib/actions/cart";

/**
 * Runs once per login: drains the guest (localStorage) cart into the user's
 * DB cart, then clears local state. Mounted invisibly in the storefront
 * layout so it fires regardless of which page the user lands on after login.
 */
export function CartMergeSync({ isLoggedIn }: { isLoggedIn: boolean }) {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const mergedRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || mergedRef.current || items.length === 0) return;
    mergedRef.current = true;
    mergeGuestCart(items).then((result) => {
      if (result.success) clear();
    });
  }, [isLoggedIn, items, clear]);

  return null;
}
