"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema, replySchema } from "@/lib/validators/review";
import type { ActionState } from "@/lib/actions/auth";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 4;

function extFor(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] ?? "bin";
}

export async function submitReview(
  orderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();

  const parsed = reviewSchema.safeParse({
    order_item_id: formData.get("order_item_id"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length > MAX_IMAGES) {
    return { error: `อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูป` };
  }
  for (const img of images) {
    if (!IMAGE_TYPES.includes(img.type)) {
      return { error: "ไฟล์รูปต้องเป็น JPG, PNG หรือ WebP เท่านั้น" };
    }
    if (img.size > MAX_IMAGE_BYTES) {
      return { error: "ไฟล์รูปต้องมีขนาดไม่เกิน 5 MB ต่อรูป" };
    }
  }

  const supabase = await createClient();

  const uploadedPaths: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const path = `${user!.id}/${parsed.data.order_item_id}/${Date.now()}-${i}.${extFor(img)}`;
    const { error: upErr } = await supabase.storage
      .from("reviews")
      .upload(path, img, { contentType: img.type });
    if (!upErr) uploadedPaths.push(path);
  }

  const { error } = await supabase.rpc("submit_review", {
    p_order_item_id: parsed.data.order_item_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment || null,
    p_image_urls: uploadedPaths,
  });
  if (error) {
    if (uploadedPaths.length > 0) await supabase.storage.from("reviews").remove(uploadedPaths);
    return { error: error.message };
  }

  revalidatePath(`/account/orders/${orderId}`);
  return { success: true };
}

export async function replyToReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("seller");

  const parsed = replySchema.safeParse({
    review_id: formData.get("review_id"),
    reply: formData.get("reply"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_review", {
    p_review_id: parsed.data.review_id,
    p_reply: parsed.data.reply,
  });
  if (error) return { error: error.message };

  revalidatePath("/seller/reviews");
  return { success: true };
}
