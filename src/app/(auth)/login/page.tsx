import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <LoginForm
      redirectTo={typeof sp.redirect === "string" ? sp.redirect : ""}
      banned={sp.error === "banned"}
    />
  );
}
