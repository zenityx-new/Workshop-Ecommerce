import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { CartView, type ShopCartGroup } from "./cart-view";

export const metadata = { title: "ตะกร้าสินค้า" };

export default async function CartPage() {
  const { user } = await getSessionUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ตะกร้าสินค้า</h1>
        <CartView mode="guest" />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let groups: ShopCartGroup[] = [];

  if (cart) {
    const { data: items } = await supabase
      .from("cart_items")
      .select("id, quantity, variant_id")
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: true });

    const variantIds = (items ?? []).map((i) => i.variant_id);
    const { data: variants } = variantIds.length
      ? await supabase
          .from("product_variants")
          .select("id, name, stock, price, product_id")
          .in("id", variantIds)
      : { data: [] as { id: string; name: string; stock: number; price: number | null; product_id: string }[] };

    const productIds = [...new Set((variants ?? []).map((v) => v.product_id))];
    const { data: products } = productIds.length
      ? await supabase
          .from("products")
          .select("id, name, price, shop_id, is_active")
          .in("id", productIds)
      : { data: [] as { id: string; name: string; price: number; shop_id: string; is_active: boolean }[] };

    const shopIds = [...new Set((products ?? []).map((p) => p.shop_id))];
    const [{ data: shops }, { data: images }] = await Promise.all([
      shopIds.length
        ? supabase.from("shops").select("id, name, slug, status").in("id", shopIds)
        : Promise.resolve({ data: [] as { id: string; name: string; slug: string; status: string }[] }),
      productIds.length
        ? supabase
            .from("product_images")
            .select("product_id, url")
            .in("product_id", productIds)
            .eq("is_primary", true)
        : Promise.resolve({ data: [] as { product_id: string; url: string }[] }),
    ]);

    const variantById = new Map((variants ?? []).map((v) => [v.id, v]));
    const productById = new Map((products ?? []).map((p) => [p.id, p]));
    const shopById = new Map((shops ?? []).map((s) => [s.id, s]));
    const imageByProduct = new Map((images ?? []).map((i) => [i.product_id, i.url]));

    const groupsMap = new Map<string, ShopCartGroup>();
    for (const item of items ?? []) {
      const variant = variantById.get(item.variant_id);
      if (!variant) continue;
      const product = productById.get(variant.product_id);
      if (!product) continue;
      const shop = shopById.get(product.shop_id);
      if (!shop) continue;
      // Product went inactive or the shop got suspended after this was added —
      // hide it from the buyable cart rather than deleting (it can reappear).
      if (!product.is_active || shop.status !== "active") continue;

      if (!groupsMap.has(shop.id)) {
        groupsMap.set(shop.id, {
          shopId: shop.id,
          shopName: shop.name,
          shopSlug: shop.slug,
          lines: [],
        });
      }
      const imagePath = imageByProduct.get(product.id) ?? null;
      groupsMap.get(shop.id)!.lines.push({
        cartItemId: item.id,
        variantId: variant.id,
        variantName: variant.name,
        productId: product.id,
        productName: product.name,
        productImage: imagePath
          ? supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl
          : null,
        price: variant.price ?? product.price,
        stock: variant.stock,
        quantity: item.quantity,
      });
    }

    groups = [...groupsMap.values()];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ตะกร้าสินค้า</h1>
      <CartView mode="db" initialGroups={groups} />
    </div>
  );
}
