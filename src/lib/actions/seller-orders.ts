"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { shipOrderSchema, rejectSlipSchema } from "@/lib/validators/order";
import type { ActionState } from "@/lib/actions/auth";
import type { Enums } from "@/lib/supabase/database.types";

function revalidateOrder(orderId: string) {
  revalidatePath(`/seller/orders/${orderId}`);
  revalidatePath("/seller/orders");
}

export async function confirmOrder(
  orderId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("seller");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: "confirmed",
  });
  if (error) return { error: error.message };

  revalidateOrder(orderId);
  return { success: true };
}

export async function shipOrder(
  orderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("seller");
  const parsed = shipOrderSchema.safeParse({
    carrier: formData.get("carrier"),
    tracking_no: formData.get("tracking_no"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: "shipped" as Enums<"order_status">,
    p_carrier: parsed.data.carrier,
    p_tracking_no: parsed.data.tracking_no,
  });
  if (error) return { error: error.message };

  revalidateOrder(orderId);
  return { success: true };
}

export async function markDelivered(
  orderId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("seller");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: "delivered",
  });
  if (error) return { error: error.message };

  revalidateOrder(orderId);
  return { success: true };
}

export async function approvePaymentSlip(
  orderId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("seller");
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_payment_slip", {
    p_order_id: orderId,
    p_approve: true,
  });
  if (error) return { error: error.message };

  revalidateOrder(orderId);
  return { success: true };
}

export async function rejectPaymentSlip(
  orderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("seller");
  const parsed = rejectSlipSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_payment_slip", {
    p_order_id: orderId,
    p_approve: false,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidateOrder(orderId);
  return { success: true };
}
