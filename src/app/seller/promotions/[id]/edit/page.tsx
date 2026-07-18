import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateCoupon } from "@/lib/actions/coupon";
import { CouponForm } from "@/components/seller/coupon-form";

export const metadata = { title: "แก้ไขคูปอง" };

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user!.id)
    .single();
  if (!shop) notFound();

  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, code, type, value, min_order, usage_limit, starts_at, ends_at, is_active, shop_id")
    .eq("id", id)
    .single();
  if (!coupon || coupon.shop_id !== shop.id) notFound();

  const updateAction = updateCoupon.bind(null, coupon.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Pencil aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขคูปอง</h1>
          <p className="text-sm text-muted-foreground font-mono">{coupon.code}</p>
        </div>
      </div>

      <CouponForm
        action={updateAction}
        submitLabel="บันทึกการแก้ไข"
        pendingText="กำลังบันทึก..."
        initialCoupon={coupon}
      />
    </div>
  );
}
