import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/wishlist-button";
import { formatTHB } from "@/lib/format";

export type ProductCardData = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  shopName: string;
  totalStock: number;
};

export function ProductCard({
  product,
  isLoggedIn,
  isWished,
}: {
  product: ProductCardData;
  isLoggedIn: boolean;
  isWished: boolean;
}) {
  const isOutOfStock = product.totalStock <= 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive">สินค้าหมด</Badge>
          </div>
        )}
        <WishlistButton
          productId={product.id}
          initialWished={isWished}
          isLoggedIn={isLoggedIn}
          className="absolute right-2 top-2"
        />
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 min-h-10 text-sm font-medium">{product.name}</p>
        <p className="text-base font-semibold text-primary">{formatTHB(product.price)}</p>
        <p className="truncate text-xs text-muted-foreground">{product.shopName}</p>
      </div>
    </Link>
  );
}
