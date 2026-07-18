"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validators/category";
import type { ActionState } from "@/lib/actions/auth";

// Category CRUD goes straight through the anon client under the
// categories_{insert,update,delete} RLS (is_admin()). No RPC needed — this is
// plain catalog config, not order/stock/price business logic (กฎเหล็ก #1).

// ASCII-safe slug from the name; Thai (or otherwise non-ASCII) names collapse
// to empty, so fall back to a stable-ish random suffix. Slug is only used in
// storefront filter URLs, so uniqueness matters more than readability.
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base) return base.slice(0, 60);
  return "cat-" + Math.random().toString(36).slice(2, 8);
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    requires_size: formData.get("requires_size") === "on",
    sort_order: formData.get("sort_order") || 0,
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, requires_size, sort_order, slug } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name,
    slug: slug || slugify(name),
    requires_size,
    sort_order,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "ชื่อหมวดหมู่หรือ slug นี้ถูกใช้งานแล้ว" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateCategory(
  categoryId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    requires_size: formData.get("requires_size") === "on",
    sort_order: formData.get("sort_order") || 0,
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, requires_size, sort_order, slug } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, slug: slug || slugify(name), requires_size, sort_order })
    .eq("id", categoryId);
  if (error) {
    if (error.code === "23505") {
      return { error: "ชื่อหมวดหมู่หรือ slug นี้ถูกใช้งานแล้ว" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteCategory(
  categoryId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const supabase = await createClient();

  // Block deletion while products still reference it (the FK would raise a
  // 23503 anyway; this returns a friendly Thai message instead).
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if ((count ?? 0) > 0) {
    return {
      error: `ลบไม่ได้ — มีสินค้า ${count} รายการอยู่ในหมวดนี้ กรุณาย้ายหรือลบสินค้าก่อน`,
    };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);
  if (error) return { error: error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { success: true };
}
