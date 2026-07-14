import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductRow } from "./product-row";

export const metadata = { title: "สินค้าของร้าน" };

const LOW_STOCK_THRESHOLD = 5;

export default async function SellerProductsPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  if (!shop) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          ไม่พบร้านค้าของคุณ
        </CardContent>
      </Card>
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, is_active, category_id")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  const productIds = (products ?? []).map((p) => p.id);

  const [{ data: variants }, { data: images }, { data: categories }] = await Promise.all([
    productIds.length
      ? supabase
          .from("product_variants")
          .select("id, product_id, name, stock")
          .in("product_id", productIds)
      : Promise.resolve({ data: [] as { id: string; product_id: string; name: string; stock: number }[] }),
    productIds.length
      ? supabase
          .from("product_images")
          .select("product_id, url, is_primary")
          .in("product_id", productIds)
          .eq("is_primary", true)
      : Promise.resolve({ data: [] as { product_id: string; url: string; is_primary: boolean }[] }),
    supabase.from("categories").select("id, name"),
  ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const primaryImageByProduct = new Map((images ?? []).map((i) => [i.product_id, i.url]));

  const rows = (products ?? []).map((p) => {
    const productVariants = (variants ?? []).filter((v) => v.product_id === p.id);
    const totalStock = productVariants.reduce((sum, v) => sum + v.stock, 0);
    const hasLowStock = productVariants.some((v) => v.stock < LOW_STOCK_THRESHOLD);
    const imagePath = primaryImageByProduct.get(p.id) ?? null;
    const imageUrl = imagePath
      ? supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl
      : null;
    return {
      product: p,
      categoryName: categoryNameById.get(p.category_id) ?? "-",
      totalStock,
      hasLowStock,
      imageUrl,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold">สินค้าของร้าน</h1>
            <p className="text-sm text-muted-foreground">{rows.length} รายการ</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/seller/products/new">
            <Plus aria-hidden />
            เพิ่มสินค้าใหม่
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Package className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีสินค้าในร้าน เริ่มเพิ่มสินค้าชิ้นแรกของคุณ
            </p>
            <Button asChild size="sm">
              <Link href="/seller/products/new">เพิ่มสินค้าใหม่</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <ProductRow key={row.product.id} {...row} />
          ))}
        </div>
      )}
    </div>
  );
}
