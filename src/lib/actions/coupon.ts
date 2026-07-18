"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { couponSchema } from "@/lib/validators/coupon";
import type { ActionState } from "@/lib/actions/auth";

async function getOwnShop(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase.from("shops").select("id").eq("owner_id", userId).single();
  return data;
}

function parseCouponForm(formData: FormData) {
  const usageLimitRaw = String(formData.get("usage_limit") ?? "").trim();
  return couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    min_order: formData.get("min_order") || "0",
    usage_limit: usageLimitRaw === "" ? null : usageLimitRaw,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    is_active: formData.get("is_active") === "on",
  });
}

export async function createCoupon(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const parsed = parseCouponForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("coupons").insert({
    shop_id: shop.id,
    code: parsed.data.code.toUpperCase(),
    type: parsed.data.type,
    value: parsed.data.value,
    min_order: parsed.data.min_order,
    usage_limit: parsed.data.usage_limit,
    starts_at: parsed.data.starts_at || null,
    ends_at: parsed.data.ends_at || null,
    is_active: parsed.data.is_active,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "รหัสคูปองนี้มีอยู่แล้วในร้านของคุณ" : "บันทึกคูปองไม่สำเร็จ",
    };
  }

  revalidatePath("/seller/promotions");
  redirect("/seller/promotions");
}

export async function updateCoupon(
  couponId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const { data: existing } = await supabase
    .from("coupons")
    .select("id, shop_id")
    .eq("id", couponId)
    .single();
  if (!existing || existing.shop_id !== shop.id) {
    return { error: "ไม่พบคูปอง หรือคุณไม่มีสิทธิ์แก้ไขคูปองนี้" };
  }

  const parsed = parseCouponForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      code: parsed.data.code.toUpperCase(),
      type: parsed.data.type,
      value: parsed.data.value,
      min_order: parsed.data.min_order,
      usage_limit: parsed.data.usage_limit,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
      is_active: parsed.data.is_active,
    })
    .eq("id", couponId);
  if (error) {
    return {
      error: error.code === "23505" ? "รหัสคูปองนี้มีอยู่แล้วในร้านของคุณ" : "บันทึกคูปองไม่สำเร็จ",
    };
  }

  revalidatePath("/seller/promotions");
  redirect("/seller/promotions");
}

export async function deleteCoupon(
  couponId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId)
    .eq("shop_id", shop.id);
  if (error) {
    return { error: "ลบคูปองไม่สำเร็จ (คูปองนี้อาจมีคำสั่งซื้อผูกอยู่แล้ว)" };
  }

  revalidatePath("/seller/promotions");
  return { success: true };
}

export async function toggleCouponActive(
  couponId: string,
  isActive: boolean,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", couponId)
    .eq("shop_id", shop.id);
  if (error) return { error: "เปลี่ยนสถานะคูปองไม่สำเร็จ" };

  revalidatePath("/seller/promotions");
  return { success: true };
}
