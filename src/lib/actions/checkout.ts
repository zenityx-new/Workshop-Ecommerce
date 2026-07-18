"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators/checkout";
import type { ActionState } from "@/lib/actions/auth";

export async function placeOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = checkoutSchema.safeParse({
    address_id: formData.get("address_id"),
    payment_method: formData.get("payment_method"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const shopIds = formData.getAll("coupon_shop_id").map(String);
  const codes = formData.getAll("coupon_code").map(String);
  const coupons = shopIds
    .map((shop_id, i) => ({ shop_id, code: codes[i] }))
    .filter((c) => c.shop_id && c.code);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("place_order", {
      p_address_id: parsed.data.address_id,
      p_payment_method: parsed.data.payment_method,
      p_coupons: coupons,
    })
    .single();

  if (error) return { error: error.message };
  if (!data?.checkout_group_id) return { error: "สั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  redirect(`/checkout/success/${data.checkout_group_id}`);
}

/** Live preview of a coupon's discount before submitting checkout — read-only,
 * does not redeem/consume the coupon's usage (place_order does that atomically). */
export async function previewCoupon(
  shopId: string,
  code: string,
  subtotal: number,
): Promise<{ discount: number } | { error: string }> {
  await requireUser();
  if (!code.trim()) return { error: "กรุณากรอกรหัสคูปอง" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("validate_coupon", { p_shop_id: shopId, p_code: code.trim(), p_subtotal: subtotal })
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "ไม่พบคูปองนี้" };
  return { discount: Number(data.discount) };
}
