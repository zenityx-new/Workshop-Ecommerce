import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { ProductDetail } from "./product-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: product?.name ?? "สินค้า" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getSessionUser();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, price, category_id, shop_id")
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();

  const [{ data: category }, { data: shop }, { data: variants }, { data: images }, wishlistResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("name, requires_size")
        .eq("id", product.category_id)
        .maybeSingle(),
      supabase
        .from("shops")
        .select("name, slug, rating_avg, rating_count")
        .eq("id", product.shop_id)
        .maybeSingle(),
      supabase
        .from("product_variants")
        .select("id, name, stock, price")
        .eq("product_id", id)
        .order("name", { ascending: true }),
      supabase
        .from("product_images")
        .select("url, is_primary, sort_order")
        .eq("product_id", id)
        .order("sort_order", { ascending: true }),
      user
        ? supabase.from("wishlists").select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (!shop) notFound();

  const imageUrls = (images ?? []).map(
    (img) => supabase.storage.from("products").getPublicUrl(img.url).data.publicUrl,
  );

  const requiresSize = category?.requires_size ?? false;
  const isSingleDefaultVariant = (variants ?? []).length === 1 && variants![0].name === "default";

  return (
    <ProductDetail
      productId={product.id}
      productName={product.name}
      description={product.description}
      basePrice={product.price}
      categoryName={category?.name ?? "-"}
      images={imageUrls}
      variants={variants ?? []}
      showSizePicker={requiresSize && !isSingleDefaultVariant}
      shop={{
        name: shop.name,
        slug: shop.slug,
        ratingAvg: shop.rating_avg,
        ratingCount: shop.rating_count,
      }}
      isLoggedIn={!!user}
      isWished={!!wishlistResult.data}
    />
  );
}
