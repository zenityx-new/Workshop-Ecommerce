"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { cancelOrderSchema } from "@/lib/validators/order";
import type { ActionState } from "@/lib/actions/auth";

const SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SLIP_BYTES = 5 * 1024 * 1024;

/** Shared by both the buyer and seller order-detail pages — ownership/status
 * rules are enforced inside the cancel_order RPC itself. */
export async function cancelOrder(
  orderId: string,
  revalidatePaths: string[],
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = cancelOrderSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  for (const path of revalidatePaths) revalidatePath(path);
  return { success: true };
}

export async function confirmOrderReceived(
  orderId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_order_received", { p_order_id: orderId });
  if (error) return { error: error.message };

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  return { success: true };
}

function extFor(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] ?? "bin";
}

export async function submitPaymentSlip(
  orderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();

  const slip = formData.get("slip");
  if (!(slip instanceof File) || slip.size === 0) {
    return { error: "กรุณาแนบรูปสลิปการโอนเงิน" };
  }
  if (!SLIP_TYPES.includes(slip.type)) {
    return { error: "ไฟล์ต้องเป็นรูปภาพ (JPG/PNG/WebP) เท่านั้น" };
  }
  if (slip.size > MAX_SLIP_BYTES) {
    return { error: "ไฟล์ต้องมีขนาดไม่เกิน 5 MB" };
  }

  const supabase = await createClient();
  const slipPath = `${user!.id}/${orderId}-${Date.now()}.${extFor(slip)}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(slipPath, slip, { contentType: slip.type, upsert: true });
  if (uploadError) return { error: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  const { error } = await supabase.rpc("submit_payment_slip", {
    p_order_id: orderId,
    p_slip_path: slipPath,
  });
  if (error) return { error: error.message };

  revalidatePath(`/account/orders/${orderId}`);
  return { success: true };
}
