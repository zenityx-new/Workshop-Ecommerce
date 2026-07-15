import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const sp = await searchParams;
  return <RegisterForm redirectTo={typeof sp.redirect === "string" ? sp.redirect : ""} />;
}
