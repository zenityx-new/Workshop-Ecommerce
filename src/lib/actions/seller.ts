"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sellerApplicationSchema } from "@/lib/validators/auth";
import type { ActionState } from "@/lib/actions/auth";

const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_BYTES = 10 * 1024 * 1024;

function extFor(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return map[file.type] ?? "bin";
}

export async function applySeller(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireUser("/login");

  // Already an approved seller — nothing to apply for.
  if (profile.role === "seller") redirect("/seller");

  const parsed = sellerApplicationSchema.safeParse({
    shop_name: formData.get("shop_name"),
    id_card_number: formData.get("id_card_number"),
    phone: formData.get("phone"),
    address: formData.get("address"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const idCard = formData.get("id_card");
  if (!(idCard instanceof File) || idCard.size === 0) {
    return { error: "กรุณาแนบรูปบัตรประชาชน" };
  }
  if (!DOC_TYPES.includes(idCard.type)) {
    return { error: "ไฟล์ต้องเป็นรูปภาพ (JPG/PNG/WebP) หรือ PDF เท่านั้น" };
  }
  if (idCard.size > MAX_DOC_BYTES) {
    return { error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" };
  }

  const supabase = await createClient();

  const idPath = `${user!.id}/id-card-${Date.now()}.${extFor(idCard)}`;
  const { error: upErr } = await supabase.storage
    .from("seller-documents")
    .upload(idPath, idCard, { contentType: idCard.type, upsert: true });
  if (upErr) {
    return { error: "อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // Optional extra document
  let extraPath: string | null = null;
  const extra = formData.get("extra_doc");
  if (extra instanceof File && extra.size > 0) {
    if (!DOC_TYPES.includes(extra.type) || extra.size > MAX_DOC_BYTES) {
      return { error: "เอกสารเพิ่มเติมไม่ถูกต้อง (รูป/PDF, ไม่เกิน 10 MB)" };
    }
    extraPath = `${user!.id}/extra-${Date.now()}.${extFor(extra)}`;
    const { error: exErr } = await supabase.storage
      .from("seller-documents")
      .upload(extraPath, extra, { contentType: extra.type, upsert: true });
    if (exErr) return { error: "อัปโหลดเอกสารเพิ่มเติมไม่สำเร็จ" };
  }

  // Upsert lets a rejected applicant re-apply (user_id is unique).
  const { error } = await supabase.from("seller_applications").upsert(
    {
      user_id: user!.id,
      shop_name: parsed.data.shop_name,
      id_card_number: parsed.data.id_card_number,
      id_card_url: idPath,
      extra_doc_url: extraPath,
      phone: parsed.data.phone,
      address: parsed.data.address,
      status: "pending",
      reject_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: "บันทึกใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/seller/pending");
  redirect("/seller/pending");
}
