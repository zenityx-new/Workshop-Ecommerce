import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Users,
  ScrollText,
  Store,
  Package,
  Banknote,
  Tags,
} from "lucide-react";
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
import { formatTHB } from "@/lib/format";

export const metadata = { title: "แผงควบคุมผู้ดูแล" };

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [
    { count: pendingCount },
    { count: buyerCount },
    { count: shopCount },
    { count: suspendedCount },
    { count: orderCount },
    { data: revenueRows },
  ] = await Promise.all([
    supabase
      .from("seller_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "buyer"),
    supabase.from("shops").select("*", { count: "exact", head: true }),
    supabase
      .from("shops")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended"),
    // ยอดออเดอร์และยอดขายไม่นับที่ยกเลิก
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .neq("status", "cancelled"),
    supabase.from("orders").select("total").neq("status", "cancelled"),
  ]);

  const totalRevenue = (revenueRows ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0,
  );

  const stats = [
    {
      icon: Store,
      label: "ร้านค้าทั้งหมด",
      value: shopCount ?? 0,
      hint:
        (suspendedCount ?? 0) > 0
          ? `ถูกระงับ ${suspendedCount} ร้าน`
          : "เปิดขายปกติทั้งหมด",
    },
    {
      icon: Users,
      label: "ผู้ซื้อทั้งหมด",
      value: buyerCount ?? 0,
      hint: "บัญชีผู้ซื้อในระบบ",
    },
    {
      icon: Package,
      label: "คำสั่งซื้อ",
      value: orderCount ?? 0,
      hint: "ไม่รวมที่ยกเลิก",
    },
    {
      icon: Banknote,
      label: "ยอดขายรวม",
      value: formatTHB(totalRevenue),
      hint: "ไม่รวมที่ยกเลิก",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">แผงควบคุมผู้ดูแลระบบ</h1>
          <p className="text-sm text-muted-foreground">
            ภาพรวมระบบและการจัดการร้านค้า ผู้ใช้ และหมวดหมู่
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <s.icon className="size-4 text-primary" aria-hidden />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="size-5 text-primary" aria-hidden />
              ใบสมัครผู้ขายที่รออนุมัติ
            </CardTitle>
            <CardDescription>คำขอเปิดร้านที่รอการตรวจสอบ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{pendingCount ?? 0}</p>
            <Button asChild size="sm">
              <Link href="/admin/sellers/pending">ตรวจสอบใบสมัคร</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="size-5 text-primary" aria-hidden />
              จัดการร้านค้า
            </CardTitle>
            <CardDescription>ตักเตือน ระงับ หรือปลดระงับร้านค้า</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/shops">ไปที่ร้านค้า</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5 text-primary" aria-hidden />
              จัดการผู้ใช้
            </CardTitle>
            <CardDescription>ค้นหา ระงับ/ปลดระงับ และตั้งสิทธิ์ผู้ดูแล</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/users">จัดการผู้ใช้</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="size-5 text-primary" aria-hidden />
              หมวดหมู่สินค้า
            </CardTitle>
            <CardDescription>เพิ่ม แก้ไข ลบ และตั้งค่าบังคับไซส์</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/categories">จัดการหมวดหมู่</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-5 text-primary" aria-hidden />
              ประวัติการดำเนินการ
            </CardTitle>
            <CardDescription>บันทึกการอนุมัติ ระงับ และจัดการผู้ใช้ทั้งหมด</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/audit-logs">ดูประวัติ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
