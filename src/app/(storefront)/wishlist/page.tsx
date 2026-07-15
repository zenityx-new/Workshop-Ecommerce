import { Heart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard, type ProductCardData } from "@/components/product-card";

export const metadata = { title: "รายการโปรด" };

export default async function WishlistPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: wishlistRows } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const productIds = (wishlistRows ?? []).map((w) => w.product_id);

  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, name, price, shop_id").in("id", productIds)
    : { data: [] as { id: string; name: string; price: number; shop_id: string }[] };

  const activeProductIds = (products ?? []).map((p) => p.id);
  const shopIds = [...new Set((products ?? []).map((p) => p.shop_id))];

  const [{ data: shops }, { data: images }, { data: variants }] = await Promise.all([
    shopIds.length
      ? supabase.from("shops").select("id, name").in("id", shopIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    activeProductIds.length
      ? supabase
          .from("product_images")
          .select("product_id, url")
          .in("product_id", activeProductIds)
          .eq("is_primary", true)
      : Promise.resolve({ data: [] as { product_id: string; url: string }[] }),
    activeProductIds.length
      ? supabase.from("product_variants").select("product_id, stock").in("product_id", activeProductIds)
      : Promise.resolve({ data: [] as { product_id: string; stock: number }[] }),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const shopNameById = new Map((shops ?? []).map((s) => [s.id, s.name]));
  const imageByProduct = new Map((images ?? []).map((i) => [i.product_id, i.url]));
  const stockByProduct = new Map<string, number>();
  for (const v of variants ?? []) {
    stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) ?? 0) + v.stock);
  }

  // Preserve wishlist order (most recently added first) — a saved product
  // that's gone inactive/suspended is simply absent from `products` (RLS).
  const rows: ProductCardData[] = productIds
    .map((id) => {
      const product = productById.get(id);
      if (!product) return null;
      const imagePath = imageByProduct.get(id) ?? null;
      const row: ProductCardData = {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: imagePath
          ? supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl
          : null,
        shopName: shopNameById.get(product.shop_id) ?? "-",
        totalStock: stockByProduct.get(product.id) ?? 0,
      };
      return row;
    })
    .filter((r): r is ProductCardData => r !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Heart aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">รายการโปรด</h1>
          <p className="text-sm text-muted-foreground">{rows.length} รายการ</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Heart className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีสินค้าในรายการโปรด กดหัวใจบนสินค้าที่สนใจเพื่อบันทึกไว้
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((product) => (
            <ProductCard key={product.id} product={product} isLoggedIn isWished />
          ))}
        </div>
      )}
    </div>
  );
}
