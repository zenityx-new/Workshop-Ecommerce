import Link from "next/link";
import { FileBarChart, Download, Package } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SalesChart, type SalesPoint } from "@/components/seller/sales-chart";
import { formatTHB } from "@/lib/format";

export const metadata = { title: "รายงานยอดขาย" };

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "รอชำระเงิน",
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  shipped: "กำลังจัดส่ง",
  delivered: "จัดส่งถึงแล้ว",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
};

const THAI_MONTH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export default async function SellerReportsPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("owner_id", user!.id)
    .single();

  if (!shop) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">รายงานยอดขาย</h1>
        <p className="text-muted-foreground">ยังไม่พบร้านค้า</p>
      </div>
    );
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("created_at, total, status")
    .eq("shop_id", shop.id);

  const all = orders ?? [];
  const active = all.filter((o) => o.status !== "cancelled");

  const totalRevenue = active.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const cancelledCount = all.length - active.length;

  // status breakdown (all statuses)
  const byStatus = new Map<string, number>();
  for (const o of all) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);

  // last 6 months revenue (exclude cancelled)
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${THAI_MONTH[d.getMonth()]} ${(d.getFullYear() + 543) % 100}`,
    });
  }
  const revByMonth = new Map<string, number>();
  for (const o of active) {
    const key = new Date(o.created_at).toISOString().slice(0, 7);
    revByMonth.set(key, (revByMonth.get(key) ?? 0) + Number(o.total ?? 0));
  }
  const monthChart: SalesPoint[] = months.map((m) => ({
    label: m.label,
    value: revByMonth.get(m.key) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileBarChart aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold">รายงานยอดขาย</h1>
            <p className="text-sm text-muted-foreground">{shop.name}</p>
          </div>
        </div>
        <Button asChild>
          {/* Route handler streams a CSV attachment; a plain download link. */}
          <a href="/seller/reports/export" download>
            <Download aria-hidden />
            ดาวน์โหลด CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ยอดขายรวม (ไม่รวมยกเลิก)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatTHB(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              คำสั่งซื้อทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ยกเลิก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cancelledCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ยอดขายราย 6 เดือน</CardTitle>
          <CardDescription>ไม่รวมคำสั่งซื้อที่ยกเลิก</CardDescription>
        </CardHeader>
        <CardContent>
          <SalesChart data={monthChart} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-5 text-primary" aria-hidden />
            สรุปตามสถานะคำสั่งซื้อ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ยังไม่มีคำสั่งซื้อ
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...byStatus.entries()].map(([status, count]) => (
                <Badge
                  key={status}
                  variant={status === "cancelled" ? "destructive" : "neutral"}
                  className="gap-1"
                >
                  {STATUS_LABEL[status] ?? status}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/seller">กลับแดชบอร์ด</Link>
        </Button>
      </div>
    </div>
  );
}
