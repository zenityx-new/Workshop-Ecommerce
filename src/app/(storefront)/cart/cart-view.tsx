"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Minus, Plus, Trash2, ShoppingCart, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateCartItemQuantity, removeCartItem, getGuestCartLines } from "@/lib/actions/cart";
import { useCartStore } from "@/stores/cart-store";
import { formatTHB } from "@/lib/format";

export type CartLine = {
  cartItemId?: string;
  variantId: string;
  variantName: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  stock: number;
  quantity: number;
};

export type ShopCartGroup = {
  shopId: string;
  shopName: string;
  shopSlug: string;
  lines: CartLine[];
};

function EmptyCart() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <ShoppingCart className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">ตะกร้าของคุณว่างเปล่า</p>
        <Button asChild size="sm">
          <Link href="/products">เลือกซื้อสินค้า</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Link
        href={`/products/${line.productId}`}
        className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
      >
        {line.productImage ? (
          <Image
            src={line.productImage}
            alt={line.productName}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-5" aria-hidden />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${line.productId}`}
          className="line-clamp-1 text-sm font-medium hover:text-primary"
        >
          {line.productName}
        </Link>
        {line.variantName !== "default" && (
          <p className="text-xs text-muted-foreground">ไซส์ {line.variantName}</p>
        )}
        <p className="mt-1 text-sm font-semibold text-primary">{formatTHB(line.price)}</p>
      </div>
      <div className="flex items-center rounded-md border">
        <button
          type="button"
          onClick={() => onQuantityChange(line.quantity - 1)}
          disabled={line.quantity <= 1}
          className="flex size-8 items-center justify-center text-muted-foreground disabled:opacity-40"
          aria-label="ลดจำนวน"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="w-8 text-center text-sm">{line.quantity}</span>
        <button
          type="button"
          onClick={() => onQuantityChange(line.quantity + 1)}
          disabled={line.quantity >= line.stock}
          className="flex size-8 items-center justify-center text-muted-foreground disabled:opacity-40"
          aria-label="เพิ่มจำนวน"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="ลบสินค้า"
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function ShopGroupCard({
  group,
  onQuantityChange,
  onRemove,
}: {
  group: ShopCartGroup;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  const subtotal = group.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return (
    <Card>
      <CardContent className="p-4">
        <Link
          href={`/shops/${group.shopSlug}`}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary"
        >
          <Store className="size-4 text-primary" aria-hidden />
          {group.shopName}
        </Link>
        <div className="divide-y">
          {group.lines.map((line) => (
            <CartLineRow
              key={line.variantId}
              line={line}
              onQuantityChange={(q) => onQuantityChange(line.variantId, q)}
              onRemove={() => onRemove(line.variantId)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">ยอดรวม {group.lines.length} รายการ</span>
          <span className="font-semibold">{formatTHB(subtotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CartSummary({ groups }: { groups: ShopCartGroup[] }) {
  const total = groups.reduce(
    (sum, g) => sum + g.lines.reduce((s, l) => s + l.price * l.quantity, 0),
    0,
  );
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>ยอดรวมทั้งหมด</span>
          <span className="text-primary">{formatTHB(total)}</span>
        </div>
        <Button className="w-full" size="lg" disabled title="เปิดใช้งานในเฟสถัดไป">
          ไปชำระเงิน (เร็ว ๆ นี้)
        </Button>
      </CardContent>
    </Card>
  );
}

function DbCartView({ initialGroups }: { initialGroups: ShopCartGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [, startTransition] = useTransition();

  function handleQuantityChange(variantId: string, quantity: number) {
    const line = groups.flatMap((g) => g.lines).find((l) => l.variantId === variantId);
    if (!line?.cartItemId) return;
    const nextQty = Math.max(0, Math.min(quantity, line.stock));

    setGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          lines:
            nextQty > 0
              ? g.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: nextQty } : l))
              : g.lines.filter((l) => l.variantId !== variantId),
        }))
        .filter((g) => g.lines.length > 0),
    );

    startTransition(async () => {
      await updateCartItemQuantity(line.cartItemId!, nextQty);
    });
  }

  function handleRemove(variantId: string) {
    const line = groups.flatMap((g) => g.lines).find((l) => l.variantId === variantId);
    if (!line?.cartItemId) return;
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, lines: g.lines.filter((l) => l.variantId !== variantId) }))
        .filter((g) => g.lines.length > 0),
    );
    startTransition(async () => {
      await removeCartItem(line.cartItemId!);
    });
  }

  if (groups.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {groups.map((g) => (
          <ShopGroupCard
            key={g.shopId}
            group={g}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
          />
        ))}
      </div>
      <div>
        <CartSummary groups={groups} />
      </div>
    </div>
  );
}

function GuestCartView() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [groups, setGroups] = useState<ShopCartGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGuestCartLines(items).then((lines) => {
      if (cancelled) return;
      const map = new Map<string, ShopCartGroup>();
      for (const line of lines) {
        if (!map.has(line.shopId)) {
          map.set(line.shopId, {
            shopId: line.shopId,
            shopName: line.shopName,
            shopSlug: line.shopSlug,
            lines: [],
          });
        }
        map.get(line.shopId)!.lines.push({
          variantId: line.variantId,
          variantName: line.variantName,
          productId: line.productId,
          productName: line.productName,
          productImage: line.productImage,
          price: line.price,
          stock: line.stock,
          quantity: line.quantity,
        });
      }
      setGroups([...map.values()]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลดตะกร้า...</div>
    );
  }
  if (groups.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {groups.map((g) => (
          <ShopGroupCard
            key={g.shopId}
            group={g}
            onQuantityChange={(variantId, q) => setQuantity(variantId, Math.max(0, q))}
            onRemove={(variantId) => removeItem(variantId)}
          />
        ))}
      </div>
      <div>
        <CartSummary groups={groups} />
      </div>
    </div>
  );
}

export function CartView({
  mode,
  initialGroups,
}: {
  mode: "db" | "guest";
  initialGroups?: ShopCartGroup[];
}) {
  if (mode === "db") return <DbCartView initialGroups={initialGroups ?? []} />;
  return <GuestCartView />;
}
