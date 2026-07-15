import Link from "next/link";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { SortSelect } from "./sort-select";
import { ProductFilters } from "./product-filters";

export const metadata = { title: "สินค้าทั้งหมด" };

const PAGE_SIZE = 24;
const SORT_VALUES = ["newest", "price_asc", "price_desc"] as const;

function toSingle(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = toSingle(params.q).trim();
  const categorySlug = toSingle(params.category);
  const sortRaw = toSingle(params.sort);
  const sort = (SORT_VALUES as readonly string[]).includes(sortRaw) ? sortRaw : "newest";
  const minPrice = params.min ? Number(toSingle(params.min)) : undefined;
  const maxPrice = params.max ? Number(toSingle(params.max)) : undefined;
  const page = Math.max(1, Number(toSingle(params.page)) || 1);

  const supabase = await createClient();
  const { user } = await getSessionUser();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });

  const categoryId = categorySlug
    ? (categories ?? []).find((c) => c.slug === categorySlug)?.id
    : undefined;

  let query = supabase
    .from("products")
    .select("id, name, price, shop_id, created_at", { count: "exact" })
    .eq("is_active", true);

  if (q) query = query.ilike("name", `%${q}%`);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (minPrice !== undefined && Number.isFinite(minPrice)) query = query.gte("price", minPrice);
  if (maxPrice !== undefined && Number.isFinite(maxPrice)) query = query.lte("price", maxPrice);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const query_ = query.range(from, from + PAGE_SIZE - 1);
  const { data: products, count } = await query_;

  const productIds = (products ?? []).map((p) => p.id);
  const shopIds = [...new Set((products ?? []).map((p) => p.shop_id))];

  const [{ data: shops }, { data: images }, { data: variants }, { data: wishlistRows }] =
    await Promise.all([
      shopIds.length
        ? supabase.from("shops").select("id, name").in("id", shopIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
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
        ? supabase
            .from("wishlists")
            .select("product_id")
            .eq("user_id", user.id)
            .in("product_id", productIds)
        : Promise.resolve({ data: [] as { product_id: string }[] }),
    ]);

  const shopNameById = new Map((shops ?? []).map((s) => [s.id, s.name]));
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
      shopName: shopNameById.get(p.shop_id) ?? "-",
      totalStock: stockByProduct.get(p.id) ?? 0,
    };
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (categorySlug) baseParams.set("category", categorySlug);
  baseParams.set("sort", sort);
  if (minPrice !== undefined) baseParams.set("min", String(minPrice));
  if (maxPrice !== undefined) baseParams.set("max", String(maxPrice));

  function hrefForPage(p: number) {
    const sp = new URLSearchParams(baseParams);
    sp.set("page", String(p));
    return `/products?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">สินค้าทั้งหมด</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString("th-TH")} รายการ</p>
        </div>
        <SortSelect current={sort} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <ProductFilters
            categories={categories ?? []}
            categorySlug={categorySlug}
            q={q}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sort={sort}
          />
        </aside>

        <div className="flex-1">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                <Package className="size-10 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/products">ล้างตัวกรอง</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
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

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={hrefForPage(page - 1)}>ก่อนหน้า</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      ก่อนหน้า
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    หน้า {page} / {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={hrefForPage(page + 1)}>ถัดไป</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      ถัดไป
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
