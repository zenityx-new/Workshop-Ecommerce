"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { productSchema, type VariantRow } from "@/lib/validators/product";
import type { ActionState } from "@/lib/actions/auth";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 8;

function extFor(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] ?? "bin";
}

type OwnShop = { id: string };

async function getOwnShop(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<OwnShop | null> {
  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .single();
  return data;
}

/**
 * หมวดทั่วไป -> variant เดียวชื่อ 'default' อ่านจากช่อง `stock`
 * หมวดที่ requires_size -> อ่านแถวจาก variant_name[]/variant_stock[]/variant_price[]/variant_id[]
 * (กฎเหล็ก: หมวดเสื้อผ้า/รองเท้าบังคับใส่ไซส์ — ตรวจที่นี่ ไม่เชื่อ client)
 */
function parseVariantRows(
  formData: FormData,
  requiresSize: boolean,
): { variants: VariantRow[] } | { error: string } {
  if (!requiresSize) {
    const stockRaw = String(formData.get("stock") ?? "").trim();
    const stock = Number(stockRaw);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "กรุณาระบุจำนวนสต๊อกเป็นจำนวนเต็มไม่ติดลบ" };
    }
    const defaultId = String(formData.get("default_variant_id") ?? "").trim();
    return { variants: [{ id: defaultId, name: "default", stock, price: null }] };
  }

  const ids = formData.getAll("variant_id").map(String);
  const names = formData.getAll("variant_name").map(String);
  const stocks = formData.getAll("variant_stock").map(String);
  const prices = formData.getAll("variant_price").map(String);

  const rows: VariantRow[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i]?.trim() ?? "";
    const stockStr = stocks[i]?.trim() ?? "";
    if (!name && !stockStr) continue;
    if (!name) return { error: `กรุณาระบุไซส์ในแถวที่ ${i + 1}` };

    const stock = Number(stockStr);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: `จำนวนสต๊อกของไซส์ "${name}" ไม่ถูกต้อง` };
    }

    const priceStr = prices[i]?.trim() ?? "";
    let price: number | null = null;
    if (priceStr) {
      const p = Number(priceStr);
      if (!Number.isFinite(p) || p < 0) {
        return { error: `ราคาของไซส์ "${name}" ไม่ถูกต้อง` };
      }
      price = p;
    }

    rows.push({ id: ids[i]?.trim() ?? "", name, stock, price });
  }

  if (rows.length === 0) {
    return { error: "หมวดหมู่นี้ต้องระบุไซส์และสต๊อกอย่างน้อย 1 รายการ" };
  }

  const seen = new Set<string>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return { error: `ไซส์ "${r.name}" ซ้ำกัน` };
    seen.add(key);
  }

  return { variants: rows };
}

function validateNewImages(files: File[]): string | null {
  for (const img of files) {
    if (!IMAGE_TYPES.includes(img.type)) {
      return "ไฟล์รูปต้องเป็น JPG, PNG หรือ WebP เท่านั้น";
    }
    if (img.size > MAX_IMAGE_BYTES) {
      return "ไฟล์รูปต้องมีขนาดไม่เกิน 5 MB ต่อรูป";
    }
  }
  return null;
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const parsed = productSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, requires_size")
    .eq("id", parsed.data.category_id)
    .single();
  if (!category) return { error: "ไม่พบหมวดหมู่ที่เลือก" };

  const variantResult = parseVariantRows(formData, category.requires_size);
  if ("error" in variantResult) return { error: variantResult.error };

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length === 0) {
    return { error: "กรุณาอัปโหลดรูปสินค้าอย่างน้อย 1 รูป" };
  }
  if (images.length > MAX_IMAGES) {
    return { error: `อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูป` };
  }
  const imageErr = validateNewImages(images);
  if (imageErr) return { error: imageErr };

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      shop_id: shop.id,
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();
  if (productError || !product) {
    return { error: "บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  const { error: variantError } = await supabase.from("product_variants").insert(
    variantResult.variants.map((v) => ({
      product_id: product.id,
      name: v.name,
      stock: v.stock,
      price: v.price,
    })),
  );
  if (variantError) {
    await supabase.from("products").delete().eq("id", product.id);
    return { error: "บันทึกไซส์/สต๊อกไม่สำเร็จ (อาจมีชื่อไซส์ซ้ำกัน)" };
  }

  const uploaded: { path: string; isPrimary: boolean; sortOrder: number }[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const path = `${shop.id}/${product.id}/${Date.now()}-${i}.${extFor(img)}`;
    const { error: upErr } = await supabase.storage
      .from("products")
      .upload(path, img, { contentType: img.type });
    if (upErr) continue;
    uploaded.push({ path, isPrimary: i === 0, sortOrder: i });
  }
  if (uploaded.length > 0) {
    await supabase.from("product_images").insert(
      uploaded.map((u) => ({
        product_id: product.id,
        url: u.path,
        is_primary: u.isPrimary,
        sort_order: u.sortOrder,
      })),
    );
  }

  revalidatePath("/seller/products");
  redirect("/seller/products");
}

export async function updateProduct(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, shop_id")
    .eq("id", productId)
    .single();
  if (!existingProduct || existingProduct.shop_id !== shop.id) {
    return { error: "ไม่พบสินค้า หรือคุณไม่มีสิทธิ์แก้ไขสินค้านี้" };
  }

  const parsed = productSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, requires_size")
    .eq("id", parsed.data.category_id)
    .single();
  if (!category) return { error: "ไม่พบหมวดหมู่ที่เลือก" };

  const variantResult = parseVariantRows(formData, category.requires_size);
  if ("error" in variantResult) return { error: variantResult.error };

  // ---- validate images before mutating anything ----
  const { data: existingImages } = await supabase
    .from("product_images")
    .select("id, url, is_primary")
    .eq("product_id", productId);

  const deleteImageIds = formData
    .getAll("delete_image_ids")
    .map(String)
    .filter(Boolean);
  const toRemove = (existingImages ?? []).filter((img) => deleteImageIds.includes(img.id));
  const remainingImages = (existingImages ?? []).filter(
    (img) => !deleteImageIds.includes(img.id),
  );

  const newImages = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const totalAfter = remainingImages.length + newImages.length;
  if (totalAfter === 0) return { error: "สินค้าต้องมีรูปอย่างน้อย 1 รูป" };
  if (totalAfter > MAX_IMAGES) {
    return {
      error: `มีรูปได้สูงสุด ${MAX_IMAGES} รูป (ปัจจุบันเหลือ ${remainingImages.length} รูปหลังลบ)`,
    };
  }
  const imageErr = validateNewImages(newImages);
  if (imageErr) return { error: imageErr };

  const primaryImageId = String(formData.get("primary_image_id") ?? "").trim();

  // ---- mutate: product row ----
  const { error: productError } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      is_active: parsed.data.is_active,
    })
    .eq("id", productId);
  if (productError) return { error: "บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  // ---- mutate: variants (reconcile insert / update / delete) ----
  const { data: currentVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  const currentIds = new Set((currentVariants ?? []).map((v) => v.id));
  const submittedIds = new Set(
    variantResult.variants.filter((v) => v.id).map((v) => v.id),
  );

  const idsToDelete = [...currentIds].filter((id) => !submittedIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("product_variants")
      .delete()
      .in("id", idsToDelete);
    if (delErr) {
      return { error: "ลบไซส์ที่ไม่ใช้แล้วไม่สำเร็จ (อาจมีคำสั่งซื้อผูกอยู่)" };
    }
  }

  for (const v of variantResult.variants) {
    if (v.id && currentIds.has(v.id)) {
      const { error } = await supabase
        .from("product_variants")
        .update({ name: v.name, stock: v.stock, price: v.price })
        .eq("id", v.id);
      if (error) return { error: `บันทึกไซส์ "${v.name}" ไม่สำเร็จ (อาจซ้ำกับไซส์เดิม)` };
    } else {
      const { error } = await supabase
        .from("product_variants")
        .insert({ product_id: productId, name: v.name, stock: v.stock, price: v.price });
      if (error) return { error: `เพิ่มไซส์ "${v.name}" ไม่สำเร็จ (อาจซ้ำกับไซส์เดิม)` };
    }
  }

  // ---- mutate: images ----
  if (toRemove.length > 0) {
    await supabase.storage.from("products").remove(toRemove.map((i) => i.url));
    await supabase
      .from("product_images")
      .delete()
      .in("id", toRemove.map((i) => i.id));
  }

  let newRows: { id: string }[] = [];
  if (newImages.length > 0) {
    const uploadedPaths: string[] = [];
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      const path = `${shop.id}/${productId}/${Date.now()}-${i}.${extFor(img)}`;
      const { error: upErr } = await supabase.storage
        .from("products")
        .upload(path, img, { contentType: img.type });
      if (!upErr) uploadedPaths.push(path);
    }
    if (uploadedPaths.length > 0) {
      const { data: inserted } = await supabase
        .from("product_images")
        .insert(
          uploadedPaths.map((path, i) => ({
            product_id: productId,
            url: path,
            is_primary: false,
            sort_order: remainingImages.length + i,
          })),
        )
        .select("id");
      newRows = inserted ?? [];
    }
  }

  const hasExistingPrimary = remainingImages.some((img) => img.is_primary);
  let finalPrimaryId: string | null = null;
  if (primaryImageId === "new" && newRows.length > 0) {
    finalPrimaryId = newRows[0].id;
  } else if (primaryImageId && primaryImageId !== "new") {
    finalPrimaryId = primaryImageId;
  } else if (!hasExistingPrimary) {
    finalPrimaryId = remainingImages[0]?.id ?? newRows[0]?.id ?? null;
  }

  if (finalPrimaryId) {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", finalPrimaryId);
  }

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${productId}/edit`);
  redirect("/seller/products");
}

export async function deleteProduct(
  productId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const { data: images } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", productId);

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("shop_id", shop.id);
  if (error) {
    return { error: "ลบสินค้าไม่สำเร็จ (สินค้านี้อาจมีคำสั่งซื้อผูกอยู่แล้ว)" };
  }

  if (images && images.length > 0) {
    await supabase.storage.from("products").remove(images.map((i) => i.url));
  }

  revalidatePath("/seller/products");
  return { success: true };
}

export async function toggleProductActive(
  productId: string,
  isActive: boolean,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const shop = await getOwnShop(supabase, user!.id);
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .eq("shop_id", shop.id);
  if (error) return { error: "เปลี่ยนสถานะสินค้าไม่สำเร็จ" };

  revalidatePath("/seller/products");
  return { success: true };
}
