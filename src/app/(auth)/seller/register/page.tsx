import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SellerRegisterForm } from "./seller-register-form";

export default async function SellerRegisterPage() {
  const { user, profile } = await requireUser();

  if (profile.role === "seller") redirect("/seller");
  if (profile.role === "admin") redirect("/");

  // Already has a pending application — send them to the status page instead
  // of the blank apply form, so resubmitting doesn't silently overwrite it.
  // Only "rejected" (or no application at all) falls through to the form.
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("seller_applications")
    .select("status")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (app?.status === "pending") redirect("/seller/pending");

  return <SellerRegisterForm />;
}
