import Link from "next/link";
import { Ticket, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CouponRow } from "./coupon-row";

export const metadata = { title: "โปรโมชั่นและคูปอง" };

export default async function SellerPromotionsPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  if (!shop) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          ไม่พบร้านค้าของคุณ
        </CardContent>
      </Card>
    );
  }

  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  const rows = coupons ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Ticket aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold">โปรโมชั่นและคูปอง</h1>
            <p className="text-sm text-muted-foreground">{rows.length} รายการ</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/seller/promotions/new">
            <Plus aria-hidden />
            สร้างคูปองใหม่
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Ticket className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีคูปองส่วนลด สร้างคูปองแรกเพื่อกระตุ้นยอดขาย
            </p>
            <Button asChild size="sm">
              <Link href="/seller/promotions/new">สร้างคูปองใหม่</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((coupon) => (
            <CouponRow key={coupon.id} coupon={coupon} />
          ))}
        </div>
      )}
    </div>
  );
}
