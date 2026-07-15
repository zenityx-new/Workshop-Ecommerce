import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDbCartGroups } from "@/lib/actions/cart";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "ชำระเงิน" };

export default async function CheckoutPage() {
  const { user } = await requireUser();

  const groups = await getDbCartGroups(user!.id);
  if (groups.length === 0) redirect("/cart");

  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ชำระเงิน</h1>
      <CheckoutForm addresses={addresses ?? []} groups={groups} />
    </div>
  );
}
