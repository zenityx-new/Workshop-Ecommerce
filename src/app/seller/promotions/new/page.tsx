import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createCoupon } from "@/lib/actions/coupon";
import { CouponForm } from "@/components/seller/coupon-form";

export const metadata = { title: "สร้างคูปองใหม่" };

export default async function NewCouponPage() {
  await requireRole("seller");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Plus aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">สร้างคูปองใหม่</h1>
          <p className="text-sm text-muted-foreground">กำหนดรหัสคูปองและเงื่อนไขการใช้งาน</p>
        </div>
      </div>

      <CouponForm action={createCoupon} submitLabel="บันทึกคูปอง" pendingText="กำลังบันทึก..." />
    </div>
  );
}
