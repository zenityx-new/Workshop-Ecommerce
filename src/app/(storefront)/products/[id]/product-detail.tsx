"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Minus, Plus, ShoppingCart, Star, Store, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/wishlist-button";
import { addToCart } from "@/lib/actions/cart";
import { useCartStore } from "@/stores/cart-store";
import { formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";

export type VariantOption = { id: string; name: string; stock: number; price: number | null };

export function ProductDetail({
  productId,
  productName,
  description,
  basePrice,
  categoryName,
  images,
  variants,
  showSizePicker,
  shop,
  isLoggedIn,
  isWished,
}: {
  productId: string;
  productName: string;
  description: string | null;
  basePrice: number;
  categoryName: string;
  images: string[];
  variants: VariantOption[];
  showSizePicker: boolean;
  shop: { name: string; slug: string; ratingAvg: number; ratingCount: number };
  isLoggedIn: boolean;
  isWished: boolean;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstAvailable?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const addLocalItem = useCartStore((s) => s.addItem);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const effectivePrice = selectedVariant?.price ?? basePrice;
  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
  const maxQuantity = selectedVariant?.stock ?? 0;

  function handleSelectVariant(variantId: string) {
    setSelectedVariantId(variantId);
    setQuantity(1);
    setAdded(false);
  }

  function handleQuantityChange(next: number) {
    setQuantity(Math.max(1, Math.min(next, Math.max(maxQuantity, 1))));
  }

  function handleAddToCart() {
    if (!selectedVariant || isOutOfStock) return;
    setError(null);

    if (!isLoggedIn) {
      addLocalItem(selectedVariant.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      return;
    }

    startTransition(async () => {
      const result = await addToCart(selectedVariant.id, quantity);
      if (result.success) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      } else {
        setError(result.error ?? "เพิ่มลงตะกร้าไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
          {images.length > 0 ? (
            <Image
              src={images[activeImage]}
              alt={productName}
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-12" aria-hidden />
            </div>
          )}
          <WishlistButton
            productId={productId}
            initialWished={isWished}
            isLoggedIn={isLoggedIn}
            className="absolute right-3 top-3"
          />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((url, idx) => (
              <button
                key={url + idx}
                type="button"
                onClick={() => setActiveImage(idx)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-lg border-2",
                  idx === activeImage ? "border-primary" : "border-transparent",
                )}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-5">
        <div>
          <Badge variant="neutral">{categoryName}</Badge>
          <h1 className="mt-2 text-2xl font-bold">{productName}</h1>
          <Link
            href={`/shops/${shop.slug}`}
            className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <Store className="size-4" aria-hidden />
            {shop.name}
            {shop.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                {shop.ratingAvg.toFixed(1)} ({shop.ratingCount})
              </span>
            )}
          </Link>
        </div>

        <p className="text-3xl font-bold text-primary">{formatTHB(effectivePrice)}</p>

        {description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>
        )}

        {showSizePicker && (
          <div>
            <p className="mb-2 text-sm font-medium">เลือกไซส์</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                const isSoldOut = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => handleSelectVariant(v.id)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                      isSelected && !isSoldOut
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent",
                      isSoldOut && "cursor-not-allowed border-input text-muted-foreground line-through opacity-50",
                    )}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">จำนวน</span>
          <div className="flex items-center rounded-md border">
            <button
              type="button"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={isOutOfStock || quantity <= 1}
              className="flex size-9 items-center justify-center text-muted-foreground disabled:opacity-40"
              aria-label="ลดจำนวน"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-10 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={isOutOfStock || quantity >= maxQuantity}
              className="flex size-9 items-center justify-center text-muted-foreground disabled:opacity-40"
              aria-label="เพิ่มจำนวน"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          {!isOutOfStock && (
            <span className="text-xs text-muted-foreground">เหลือ {maxQuantity} ชิ้น</span>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          size="lg"
          className="w-full"
          disabled={isOutOfStock || pending}
          onClick={handleAddToCart}
        >
          {added ? (
            <>
              <CheckCircle2 aria-hidden />
              เพิ่มลงตะกร้าแล้ว
            </>
          ) : isOutOfStock ? (
            "สินค้าหมด"
          ) : (
            <>
              <ShoppingCart aria-hidden />
              {pending ? "กำลังเพิ่ม..." : "เพิ่มลงตะกร้า"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
