"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  profileSchema,
} from "@/lib/validators/auth";

export type ActionState = {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  redirectTo?: string;
};

function safeRedirectPath(input: FormDataEntryValue | null): string | null {
  const v = typeof input === "string" ? input : "";
  // only allow internal absolute paths, never open redirects
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return null;
}

export async function registerBuyer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { full_name, email, password, phone } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, phone: phone || null } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already"))
      return { error: "อีเมลนี้ถูกใช้งานแล้ว" };
    return { error: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // If email confirmation is enabled there is no session yet.
  if (!data.session) {
    return {
      notice:
        "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ",
    };
  }

  const target = safeRedirectPath(formData.get("redirect"));
  redirect(target ?? "/account");
}

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name")
    .eq("id", data.user.id)
    .single();

  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  const target = safeRedirectPath(formData.get("redirect"));
  const destination =
    target ?? (profile?.role === "admin" ? "/admin" : profile?.role === "seller" ? "/seller" : "/");

  return {
    success: true,
    notice: profile?.full_name ? `ยินดีต้อนรับกลับ, ${profile.full_name}` : "ยินดีต้อนรับกลับ",
    redirectTo: destination,
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

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

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_url, banner_url")
    .eq("id", user!.id)
    .single();

  let avatarPath = current?.avatar_url ?? null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!IMAGE_TYPES.includes(avatar.type)) {
      return { error: "รูปโปรไฟล์ต้องเป็นไฟล์ JPG, PNG หรือ WebP เท่านั้น" };
    }
    if (avatar.size > MAX_IMAGE_BYTES) {
      return { error: "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 10 MB" };
    }
    const path = `${user!.id}/avatar-${Date.now()}.${extFor(avatar)}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { contentType: avatar.type, upsert: true });
    if (upErr) return { error: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    avatarPath = path;
  }

  let bannerPath = current?.banner_url ?? null;
  const banner = formData.get("banner");
  if (banner instanceof File && banner.size > 0) {
    if (!IMAGE_TYPES.includes(banner.type)) {
      return { error: "ภาพปกต้องเป็นไฟล์ JPG, PNG หรือ WebP เท่านั้น" };
    }
    if (banner.size > MAX_IMAGE_BYTES) {
      return { error: "ภาพปกต้องมีขนาดไม่เกิน 10 MB" };
    }
    const path = `${user!.id}/banner-${Date.now()}.${extFor(banner)}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, banner, { contentType: banner.type, upsert: true });
    if (upErr) return { error: "อัปโหลดภาพปกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    bannerPath = path;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      avatar_url: avatarPath,
      banner_url: bannerPath,
    })
    .eq("id", user!.id);

  if (error) return { error: "บันทึกข้อมูลไม่สำเร็จ" };

  revalidatePath("/account");
  return { success: true, notice: "บันทึกข้อมูลเรียบร้อยแล้ว" };
}
