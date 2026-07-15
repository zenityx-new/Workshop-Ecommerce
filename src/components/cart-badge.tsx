"use client";

import { useSyncExternalStore } from "react";
import { useCartStore } from "@/stores/cart-store";

/**
 * Guests' item count only exists in localStorage, which the server can't see —
 * subscribe to zustand's persist-hydration signal (via useSyncExternalStore,
 * not an effect+setState) so SSR and the pre-hydration client paint agree on 0.
 */
function useHasHydrated() {
  return useSyncExternalStore(
    (callback) => useCartStore.persist.onFinishHydration(callback),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}

export function CartBadge({ dbCount, isLoggedIn }: { dbCount: number; isLoggedIn: boolean }) {
  const hasHydrated = useHasHydrated();
  const localCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  const count = isLoggedIn ? dbCount : hasHydrated ? localCount : 0;
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
