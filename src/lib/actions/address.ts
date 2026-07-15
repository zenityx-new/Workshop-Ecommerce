"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validators/address";
import type { ActionState } from "@/lib/actions/auth";

function parseAddressForm(formData: FormData) {
  return addressSchema.safeParse({
    recipient_name: formData.get("recipient_name"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    sub_district: formData.get("sub_district"),
    district: formData.get("district"),
    province: formData.get("province"),
    postal_code: formData.get("postal_code"),
    is_default: formData.get("is_default"),
  });
}

export async function createAddress(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();
  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", user!.id)
    .limit(1);
  const isFirst = !existing || existing.length === 0;

  if (parsed.data.is_default || isFirst) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
  }

  const { error } = await supabase.from("addresses").insert({
    user_id: user!.id,
    recipient_name: parsed.data.recipient_name,
    phone: parsed.data.phone,
    line1: parsed.data.line1,
    sub_district: parsed.data.sub_district || null,
    district: parsed.data.district || null,
    province: parsed.data.province,
    postal_code: parsed.data.postal_code,
    is_default: parsed.data.is_default || isFirst,
  });
  if (error) return { error: "บันทึกที่อยู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function updateAddress(
  addressId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();
  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  if (parsed.data.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
  }

  const { error } = await supabase
    .from("addresses")
    .update({
      recipient_name: parsed.data.recipient_name,
      phone: parsed.data.phone,
      line1: parsed.data.line1,
      sub_district: parsed.data.sub_district || null,
      district: parsed.data.district || null,
      province: parsed.data.province,
      postal_code: parsed.data.postal_code,
      is_default: parsed.data.is_default ?? false,
    })
    .eq("id", addressId);
  if (error) return { error: "บันทึกที่อยู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function deleteAddress(
  addressId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", addressId);
  if (error) return { error: "ลบที่อยู่ไม่สำเร็จ" };

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function setDefaultAddress(
  addressId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();
  const supabase = await createClient();

  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId);
  if (error) return { error: "ตั้งเป็นที่อยู่หลักไม่สำเร็จ" };

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}
