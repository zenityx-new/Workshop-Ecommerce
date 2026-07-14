import Link from "next/link";
import { ShieldCheck, UserCheck, Users, ScrollText } from "lucide-react";
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

export const metadata = { title: "แผงควบคุมผู้ดูแล" };

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [{ count: pendingCount }, { count: userCount }, { count: shopCount }] =
    await Promise.all([
      supabase
        .from("seller_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("shops").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">แผงควบคุมผู้ดูแลระบบ</h1>
          <p className="text-sm text-muted-foreground">
            จัดการผู้ขาย ผู้ใช้ และร้านค้าทั้งหมด
          </p>
        </div>
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
              <Users className="size-5 text-primary" aria-hidden />
              ผู้ใช้ทั้งหมด
            </CardTitle>
            <CardDescription>ค้นหา ระงับ/ปลดระงับ และตั้งสิทธิ์ผู้ดูแล</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{userCount ?? 0}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/users">จัดการผู้ใช้</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ร้านค้าทั้งหมด</CardTitle>
            <CardDescription>จำนวนร้านค้าที่เปิดใช้งานในระบบ</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{shopCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-5 text-primary" aria-hidden />
              ประวัติการดำเนินการ
            </CardTitle>
            <CardDescription>ดูบันทึกการอนุมัติและจัดการผู้ใช้ทั้งหมด</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/audit-logs">ดูประวัติ</Link>
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
