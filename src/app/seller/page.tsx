import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, AlertTriangle, Settings } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "ร้านของฉัน" };

const LOW_STOCK_THRESHOLD = 5;

export default async function SellerDashboardPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, status")
    .eq("owner_id", user!.id)
    .single();

  let productCount = 0;
  let lowStockCount = 0;
  if (shop) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id);
    productCount = count ?? 0;

    const { data: shopProducts } = await supabase
      .from("products")
      .select("id")
      .eq("shop_id", shop.id);
    const productIds = (shopProducts ?? []).map((p) => p.id);

    if (productIds.length > 0) {
      const { count: lowCount } = await supabase
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .in("product_id", productIds)
        .lt("stock", LOW_STOCK_THRESHOLD);
      lowStockCount = lowCount ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ร้านของฉัน</h1>
          <p className="text-sm text-muted-foreground">
            {shop?.name ?? "ยินดีต้อนรับสู่ระบบผู้ขาย"}
          </p>
        </div>
        {shop?.status === "suspended" && (
          <Badge variant="destructive">ร้านถูกระงับ</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-5 text-primary" aria-hidden />
              สินค้าทั้งหมด
            </CardTitle>
            <CardDescription>{productCount} รายการ</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/products">จัดการสินค้า</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-5 text-warning-foreground" aria-hidden />
              สต๊อกใกล้หมด
            </CardTitle>
            <CardDescription>
              {lowStockCount} ไซส์ (ต่ำกว่า {LOW_STOCK_THRESHOLD} ชิ้น)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/products">ดูรายการสินค้า</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="size-5 text-primary" aria-hidden />
              ตั้งค่าร้านค้า
            </CardTitle>
            <CardDescription>ชื่อร้าน โลโก้ แบนเนอร์ พร้อมเพย์</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/shop-settings">แก้ไขการตั้งค่า</Link>
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
      </div>
    </div>
  );
}
