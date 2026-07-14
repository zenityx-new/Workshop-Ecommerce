import Link from "next/link";
import { ShieldCheck, UserCheck, Users, Info } from "lucide-react";
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

export const metadata = { title: "แผงควบคุมผู้ดูแล" };

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { count: pendingCount } = await supabase
    .from("seller_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

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

      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          หน้านี้เป็นโครงเริ่มต้น การอนุมัติผู้ขายและสถิติระบบจะเพิ่มในเฟสถัดไป
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="size-5 text-primary" aria-hidden />
              ใบสมัครผู้ขายที่รออนุมัติ
            </CardTitle>
            <CardDescription>คำขอเปิดร้านที่รอการตรวจสอบ</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5 text-primary" aria-hidden />
              จัดการผู้ใช้
            </CardTitle>
            <CardDescription>ค้นหาและจัดการบัญชีผู้ใช้ (เร็ว ๆ นี้)</CardDescription>
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
