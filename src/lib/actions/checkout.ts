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

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("place_order", {
      p_address_id: parsed.data.address_id,
      p_payment_method: parsed.data.payment_method,
    })
    .single();

  if (error) return { error: error.message };
  if (!data?.checkout_group_id) return { error: "สั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  redirect(`/checkout/success/${data.checkout_group_id}`);
}
