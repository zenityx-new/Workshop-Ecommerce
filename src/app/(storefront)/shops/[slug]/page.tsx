import { notFound } from "next/navigation";
import Image from "next/image";
import { Store, Star, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard, type ProductCardData } from "@/components/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: shop } = await supabase.from("shops").select("name").eq("slug", slug).maybeSingle();
  return { title: shop?.name ?? "หน้าร้าน" };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { user } = await getSessionUser();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, slug, description, logo_url, banner_url, rating_avg, rating_count")
    .eq("slug", slug)
    .maybeSingle();
  if (!shop) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const productIds = (products ?? []).map((p) => p.id);

  const [{ data: images }, { data: variants }, { data: wishlistRows }] = await Promise.all([
    productIds.length
      ? supabase
          .from("product_images")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_primary", true)
      : Promise.resolve({ data: [] as { product_id: string; url: string }[] }),
    productIds.length
      ? supabase.from("product_variants").select("product_id, stock").in("product_id", productIds)
      : Promise.resolve({ data: [] as { product_id: string; stock: number }[] }),
    user && productIds.length
      ? supabase.from("wishlists").select("product_id").eq("user_id", user.id).in("product_id", productIds)
      : Promise.resolve({ data: [] as { product_id: string }[] }),
  ]);

  const imageByProduct = new Map((images ?? []).map((i) => [i.product_id, i.url]));
  const wishedProductIds = new Set((wishlistRows ?? []).map((w) => w.product_id));
  const stockByProduct = new Map<string, number>();
  for (const v of variants ?? []) {
    stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) ?? 0) + v.stock);
  }

  const rows: ProductCardData[] = (products ?? []).map((p) => {
    const imagePath = imageByProduct.get(p.id) ?? null;
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: imagePath
        ? supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl
        : null,
      shopName: shop.name,
      totalStock: stockByProduct.get(p.id) ?? 0,
    };
  });

  const logoUrl = shop.logo_url
    ? supabase.storage.from("shops").getPublicUrl(shop.logo_url).data.publicUrl
    : null;
  const bannerUrl = shop.banner_url
    ? supabase.storage.from("shops").getPublicUrl(shop.banner_url).data.publicUrl
    : null;

  return (
    <div className="space-y-8">
      <div>
        <div className="relative h-36 w-full overflow-hidden rounded-xl border bg-muted sm:h-48">
          {bannerUrl ? (
            <Image src={bannerUrl} alt="" fill sizes="1200px" className="object-cover" unoptimized />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Store className="size-10" aria-hidden />
            </div>
          )}
        </div>

        <div className="-mt-10 flex flex-col items-start gap-3 px-4 sm:-mt-12 sm:flex-row sm:items-end">
          <div className="size-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm sm:size-24">
            {logoUrl ? (
              <Image src={logoUrl} alt={shop.name} width={96} height={96} className="size-full object-cover" unoptimized />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Store className="size-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl font-bold sm:text-2xl">{shop.name}</h1>
            {shop.rating_count > 0 ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="size-4 fill-warning text-warning" aria-hidden />
                {shop.rating_avg.toFixed(1)} ({shop.rating_count} รีวิว)
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">ยังไม่มีรีวิว</p>
            )}
          </div>
        </div>

        {shop.description && (
          <p className="mt-4 px-4 text-sm text-muted-foreground">{shop.description}</p>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">สินค้าในร้าน ({rows.length})</h2>
        {rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Package className="size-10 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">ร้านนี้ยังไม่มีสินค้าวางขาย</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isLoggedIn={!!user}
                isWished={wishedProductIds.has(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
