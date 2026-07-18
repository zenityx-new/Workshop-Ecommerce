"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sellerApplicationSchema } from "@/lib/validators/auth";
import type { ActionState } from "@/lib/actions/auth";

const DOC_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  // Photos taken on iPhones/newer Android arrive as HEIC/HEIF — accept them so
  // a user snapping their ID card with a phone isn't silently rejected.
  "image/heic",
  "image/heif",
  "application/pdf",
];
const DOC_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"];
const MAX_DOC_BYTES = 10 * 1024 * 1024;

function fileExt(file: File): string {
  const m = /\.([a-z0-9]+)$/i.exec(file.name);
  return m ? m[1].toLowerCase() : "";
}

/**
 * A doc is allowed if its MIME type is known-good, OR — for the many mobile
 * browsers that hand us an empty/`application/octet-stream` type — its file
 * extension is one we accept. Without the extension fallback, real phone
 * uploads get rejected with a confusing "wrong file type" error.
 */
function isAllowedDoc(file: File): boolean {
  if (DOC_TYPES.includes(file.type)) return true;
  const ext = fileExt(file);
  if (!file.type || file.type === "application/octet-stream") {
    return DOC_EXTS.includes(ext);
  }
  return false;
}

function extFor(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
  };
  return map[file.type] || fileExt(file) || "bin";
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

/**
 * The MIME the Storage bucket must see. The bucket enforces its own
 * `allowed_mime_types`, so uploading with the browser's empty/octet-stream
 * type would be rejected there even after our own validation passed — derive
 * a real type from the extension in that case.
 */
function contentTypeFor(file: File): string {
  if (DOC_TYPES.includes(file.type)) return file.type;
  return EXT_MIME[fileExt(file)] ?? "application/octet-stream";
}

export async function applySeller(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireUser("/login");

  // Already an approved seller — nothing to apply for.
  if (profile.role === "seller") redirect("/seller");

  // Admin is an oversight-only role and can never hold a shop.
  if (profile.role === "admin") return { error: "บัญชีผู้ดูแลระบบไม่สามารถสมัครเป็นผู้ขายได้" };

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
  if (!isAllowedDoc(idCard)) {
    return { error: "ไฟล์ต้องเป็นรูปภาพ (JPG, PNG, WebP, HEIC) หรือ PDF เท่านั้น" };
  }
  if (idCard.size > MAX_DOC_BYTES) {
    return { error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" };
  }

  const supabase = await createClient();

  const idPath = `${user!.id}/id-card-${Date.now()}.${extFor(idCard)}`;
  const { error: upErr } = await supabase.storage
    .from("seller-documents")
    .upload(idPath, idCard, { contentType: contentTypeFor(idCard), upsert: true });
  if (upErr) {
    console.error("[applySeller] id_card upload failed:", upErr);
    return { error: "อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // Optional extra document
  let extraPath: string | null = null;
  const extra = formData.get("extra_doc");
  if (extra instanceof File && extra.size > 0) {
    if (!isAllowedDoc(extra) || extra.size > MAX_DOC_BYTES) {
      return { error: "เอกสารเพิ่มเติมไม่ถูกต้อง (รูป/PDF, ไม่เกิน 10 MB)" };
    }
    extraPath = `${user!.id}/extra-${Date.now()}.${extFor(extra)}`;
    const { error: exErr } = await supabase.storage
      .from("seller-documents")
      .upload(extraPath, extra, { contentType: contentTypeFor(extra), upsert: true });
    if (exErr) {
      console.error("[applySeller] extra_doc upload failed:", exErr);
      return { error: "อัปโหลดเอกสารเพิ่มเติมไม่สำเร็จ" };
    }
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
    console.error("[applySeller] seller_applications upsert failed:", error);
    return { error: "บันทึกใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/seller/pending");
  // A client-side "submitted!" acknowledgment (e.g. a modal) on THIS page
  // doesn't work: every Server Action response triggers Next.js to
  // automatically re-render this route's Server Component too, and
  // page.tsx's own "already has a pending application" guard (see that
  // file) fires on that re-render and redirects away immediately — before
  // the client ever gets to react to a returned `{success: true}`. So the
  // confirmation has to live on the destination page instead, via a URL
  // flag it can read after the redirect actually lands.
  redirect("/seller/pending?submitted=1");
}
