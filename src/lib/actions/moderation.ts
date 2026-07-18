"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { warnShopSchema, suspendShopSchema } from "@/lib/validators/moderation";
import type { ActionState } from "@/lib/actions/auth";

// Admin-only shop moderation. Each action re-checks the admin role here and
// the underlying RPC re-checks is_admin() inside Postgres (defense in depth,
// กฎเหล็ก #5). Suspending flips shops.status -> the storefront/product RLS
// hides the shop and its products immediately, so we revalidate the public
// paths too.

export async function warnShop(
  shopId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = warnShopSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("warn_shop", {
    p_shop_id: shopId,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/shops");
  return { success: true };
}

export async function suspendShop(
  shopId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = suspendShopSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_shop_status", {
    p_shop_id: shopId,
    p_status: "suspended",
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/shops");
  revalidatePath("/", "layout"); // suspended shop + its products vanish from storefront
  return { success: true };
}

export async function unsuspendShop(
  shopId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_shop_status", {
    p_shop_id: shopId,
    p_status: "active",
    p_reason: null,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/shops");
  revalidatePath("/", "layout");
  return { success: true };
}
