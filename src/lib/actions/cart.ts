"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type CartActionResult = { success: boolean; error?: string };

async function getOrCreateCartId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id;
}

/** Adds a variant to the logged-in user's DB cart. Guests use the Zustand store instead. */
export async function addToCart(variantId: string, quantity: number): Promise<CartActionResult> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock")
    .eq("id", variantId)
    .maybeSingle();
  if (!variant) return { success: false, error: "ไม่พบสินค้านี้" };
  if (variant.stock <= 0) return { success: false, error: "สินค้าหมดสต๊อก" };

  const cartId = await getOrCreateCartId(supabase, user!.id);
  if (!cartId) return { success: false, error: "สร้างตะกร้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (existingItem) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: Math.min(existingItem.quantity + quantity, variant.stock) })
      .eq("id", existingItem.id);
    if (error) return { success: false, error: "เพิ่มลงตะกร้าไม่สำเร็จ" };
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartId,
      variant_id: variantId,
      quantity: Math.min(quantity, variant.stock),
    });
    if (error) return { success: false, error: "เพิ่มลงตะกร้าไม่สำเร็จ" };
  }

  revalidatePath("/cart");
  return { success: true };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  await requireUser();
  const supabase = await createClient();

  // Ownership is enforced by RLS (cart_items_all requires the parent cart's
  // user_id = auth.uid()) — a mismatched id here simply matches zero rows.
  if (quantity <= 0) {
    const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
    if (error) return { success: false, error: "ลบสินค้าไม่สำเร็จ" };
    revalidatePath("/cart");
    return { success: true };
  }

  const { data: item } = await supabase
    .from("cart_items")
    .select("variant_id")
    .eq("id", cartItemId)
    .maybeSingle();
  if (!item) return { success: false, error: "ไม่พบรายการนี้" };

  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock")
    .eq("id", item.variant_id)
    .maybeSingle();
  if (!variant) return { success: false, error: "ไม่พบสินค้านี้" };

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity: Math.min(quantity, variant.stock) })
    .eq("id", cartItemId);
  if (error) return { success: false, error: "แก้ไขจำนวนไม่สำเร็จ" };

  revalidatePath("/cart");
  return { success: true };
}

export async function removeCartItem(cartItemId: string): Promise<CartActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
  if (error) return { success: false, error: "ลบสินค้าไม่สำเร็จ" };
  revalidatePath("/cart");
  return { success: true };
}

/** Drains the guest (localStorage) cart into the now-authenticated user's DB cart. */
export async function mergeGuestCart(
  items: { variantId: string; quantity: number }[],
): Promise<CartActionResult> {
  if (items.length === 0) return { success: true };
  const { user } = await requireUser();
  const supabase = await createClient();

  const cartId = await getOrCreateCartId(supabase, user!.id);
  if (!cartId) return { success: false, error: "สร้างตะกร้าไม่สำเร็จ" };

  for (const item of items) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("stock")
      .eq("id", item.variantId)
      .maybeSingle();
    if (!variant || variant.stock <= 0) continue;

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", item.variantId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("cart_items")
        .update({ quantity: Math.min(existing.quantity + item.quantity, variant.stock) })
        .eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({
        cart_id: cartId,
        variant_id: item.variantId,
        quantity: Math.min(item.quantity, variant.stock),
      });
    }
  }

  revalidatePath("/cart");
  return { success: true };
}

export type GuestCartLine = {
  variantId: string;
  variantName: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  stock: number;
  shopId: string;
  shopName: string;
  shopSlug: string;
  quantity: number;
};

/**
 * Public lookup so the guest (localStorage) cart can render live price/stock —
 * relies on the normal RLS read policies, so a variant whose product/shop has
 * gone inactive or suspended simply won't come back here.
 */
export async function getGuestCartLines(
  items: { variantId: string; quantity: number }[],
): Promise<GuestCartLine[]> {
  if (items.length === 0) return [];
  const supabase = await createClient();
  const variantIds = items.map((i) => i.variantId);

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, name, stock, price, product_id")
    .in("id", variantIds);
  if (!variants || variants.length === 0) return [];

  const productIds = [...new Set(variants.map((v) => v.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, shop_id")
    .in("id", productIds);
  const shopIds = [...new Set((products ?? []).map((p) => p.shop_id))];

  const [{ data: shops }, { data: images }] = await Promise.all([
    supabase.from("shops").select("id, name, slug").in("id", shopIds),
    supabase
      .from("product_images")
      .select("product_id, url")
      .in("product_id", productIds)
      .eq("is_primary", true),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const shopById = new Map((shops ?? []).map((s) => [s.id, s]));
  const imageByProduct = new Map((images ?? []).map((i) => [i.product_id, i.url]));
  const qtyByVariant = new Map(items.map((i) => [i.variantId, i.quantity]));

  const lines: GuestCartLine[] = [];
  for (const v of variants) {
    const product = productById.get(v.product_id);
    if (!product) continue;
    const shop = shopById.get(product.shop_id);
    if (!shop) continue;
    const imagePath = imageByProduct.get(product.id) ?? null;
    lines.push({
      variantId: v.id,
      variantName: v.name,
      productId: product.id,
      productName: product.name,
      productImage: imagePath
        ? supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl
        : null,
      price: v.price ?? product.price,
      stock: v.stock,
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      quantity: qtyByVariant.get(v.id) ?? 1,
    });
  }
  return lines;
}
