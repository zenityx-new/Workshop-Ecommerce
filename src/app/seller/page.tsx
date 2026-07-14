import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata = { title: "ร้านของฉัน" };

export default async function SellerDashboardPage() {
  await requireRole("seller");
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("name, status")
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ร้านของฉัน</h1>
          <p className="text-sm text-muted-foreground">
            {shop?.name ?? "ยินดีต้อนรับสู่ระบบผู้ขาย"}
          </p>
        </div>
      </div>

      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          บัญชีผู้ขายของคุณได้รับการอนุมัติแล้ว
          การจัดการสินค้าและคำสั่งซื้อจะเปิดใช้งานในเฟสถัดไป
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-5 text-primary" aria-hidden />
              สินค้า
            </CardTitle>
            <CardDescription>จัดการสินค้าและสต๊อก (เร็ว ๆ นี้)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>
              ยังไม่เปิดใช้งาน
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-5 text-primary" aria-hidden />
              คำสั่งซื้อ
            </CardTitle>
            <CardDescription>จัดการออเดอร์ของร้าน (เร็ว ๆ นี้)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>
              ยังไม่เปิดใช้งาน
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">กลับหน้าร้าน</CardTitle>
            <CardDescription>ดูหน้าตลาดในมุมมองผู้ซื้อ</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/">ไปหน้าแรก</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
