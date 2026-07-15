"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type WishlistActionResult = { success: boolean; wished: boolean; error?: string };

/** Caller must already know the user is logged in (guard in the client component) — see WishlistButton. */
export async function toggleWishlist(productId: string): Promise<WishlistActionResult> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user!.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("wishlists").delete().eq("id", existing.id);
    if (error) return { success: false, wished: true, error: "ลบออกจากรายการโปรดไม่สำเร็จ" };
    revalidatePath("/wishlist");
    return { success: true, wished: false };
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user!.id, product_id: productId });
  if (error) return { success: false, wished: false, error: "เพิ่มในรายการโปรดไม่สำเร็จ" };
  revalidatePath("/wishlist");
  return { success: true, wished: true };
}
