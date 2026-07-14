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

  redirect("/account");
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
    .select("role, status")
    .eq("id", data.user.id)
    .single();

  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  const target = safeRedirectPath(formData.get("redirect"));
  if (target) redirect(target);
  redirect(
    profile?.role === "admin"
      ? "/admin"
      : profile?.role === "seller"
        ? "/seller"
        : "/",
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
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
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
    })
    .eq("id", user!.id);

  if (error) return { error: "บันทึกข้อมูลไม่สำเร็จ" };

  revalidatePath("/account");
  return { success: true, notice: "บันทึกข้อมูลเรียบร้อยแล้ว" };
}
