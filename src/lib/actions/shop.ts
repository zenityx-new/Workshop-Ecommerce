"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { shopSettingsSchema } from "@/lib/validators/shop";
import type { ActionState } from "@/lib/actions/auth";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function extFor(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] ?? "bin";
}

export async function updateShopSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, logo_url, banner_url")
    .eq("owner_id", user!.id)
    .single();
  if (!shop) return { error: "ไม่พบร้านค้าของคุณ" };

  const parsed = shopSettingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    promptpay_id: formData.get("promptpay_id"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let logoPath = shop.logo_url;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!IMAGE_TYPES.includes(logo.type)) {
      return { error: "โลโก้ต้องเป็นไฟล์ JPG, PNG หรือ WebP เท่านั้น" };
    }
    if (logo.size > MAX_IMAGE_BYTES) {
      return { error: "โลโก้ต้องมีขนาดไม่เกิน 10 MB" };
    }
    const path = `${shop.id}/logo-${Date.now()}.${extFor(logo)}`;
    const { error: upErr } = await supabase.storage
      .from("shops")
      .upload(path, logo, { contentType: logo.type, upsert: true });
    if (upErr) return { error: "อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    logoPath = path;
  }

  let bannerPath = shop.banner_url;
  const banner = formData.get("banner");
  if (banner instanceof File && banner.size > 0) {
    if (!IMAGE_TYPES.includes(banner.type)) {
      return { error: "แบนเนอร์ต้องเป็นไฟล์ JPG, PNG หรือ WebP เท่านั้น" };
    }
    if (banner.size > MAX_IMAGE_BYTES) {
      return { error: "แบนเนอร์ต้องมีขนาดไม่เกิน 10 MB" };
    }
    const path = `${shop.id}/banner-${Date.now()}.${extFor(banner)}`;
    const { error: upErr } = await supabase.storage
      .from("shops")
      .upload(path, banner, { contentType: banner.type, upsert: true });
    if (upErr) return { error: "อัปโหลดแบนเนอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    bannerPath = path;
  }

  const { error } = await supabase
    .from("shops")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      promptpay_id: parsed.data.promptpay_id || null,
      logo_url: logoPath,
      banner_url: bannerPath,
    })
    .eq("id", shop.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "ชื่อร้านนี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น" };
    }
    return { error: "บันทึกการตั้งค่าร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/seller/shop-settings");
  revalidatePath("/seller");
  return { success: true, notice: "บันทึกการตั้งค่าร้านเรียบร้อยแล้ว" };
}
