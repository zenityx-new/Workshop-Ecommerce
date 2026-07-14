"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rejectApplicationSchema } from "@/lib/validators/admin";
import type { ActionState } from "@/lib/actions/auth";

// Every action re-checks the admin role here (server actions are callable
// directly, not just from an admin-gated page) and the underlying RPC also
// re-checks is_admin() inside Postgres — defense in depth per กฎเหล็ก #5.

export async function approveSellerApplication(
  applicationId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_seller_application", {
    p_application_id: applicationId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/sellers/pending");
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectSellerApplication(
  applicationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = rejectApplicationSchema.safeParse({
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_seller_application", {
    p_application_id: applicationId,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/sellers/pending");
  revalidatePath("/admin");
  return { success: true };
}

export async function setUserStatus(
  userId: string,
  status: "active" | "banned",
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_status", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}

export async function promoteToAdmin(
  userId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_to_admin", {
    p_user_id: userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}
