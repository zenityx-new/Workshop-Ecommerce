"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/lib/actions/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initialWished,
  isLoggedIn,
  className,
}: {
  productId: string;
  initialWished: boolean;
  isLoggedIn: boolean;
  className?: string;
}) {
  const [wished, setWished] = useState(initialWished);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      const redirectTo = `${pathname}?${searchParams.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }
    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if (result.success) setWished(result.wished);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={wished ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      aria-pressed={wished}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-destructive disabled:opacity-60",
        className,
      )}
    >
      <Heart className={cn("size-4", wished && "fill-destructive text-destructive")} aria-hidden />
    </button>
  );
}
