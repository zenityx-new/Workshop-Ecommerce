import Link from "next/link";
import { UserRound, Store, Package, MapPin, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "บัญชีของฉัน" };

export default async function AccountPage() {
  const { user, profile } = await requireUser();
  const isSeller = profile.role === "seller";
  const isAdmin = profile.role === "admin";
  const isBuyerOnly = !isSeller && !isAdmin;

  const supabase = await createClient();
  const avatarUrl = profile.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;
  const bannerUrl = profile.banner_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.banner_url).data.publicUrl
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserRound aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
          <p className="text-sm text-muted-foreground">
            จัดการข้อมูลส่วนตัวและการตั้งค่า
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
            <CardDescription>แก้ไขชื่อและเบอร์ติดต่อของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              email={user!.email ?? ""}
              fullName={profile.full_name ?? ""}
              phone={profile.phone ?? ""}
              avatarUrl={avatarUrl}
              bannerUrl={bannerUrl}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="size-5 text-primary" aria-hidden />
                  ร้านค้าของฉัน
                </CardTitle>
                <CardDescription>
                  {isSeller
                    ? "ไปยังแดชบอร์ดผู้ขายของคุณ"
                    : "เปิดร้านเพื่อเริ่มขายสินค้าบนแพลตฟอร์ม"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant={isSeller ? "default" : "outline"}>
                  <Link href={isSeller ? "/seller" : "/seller/pending"}>
                    {isSeller ? "ไปแดชบอร์ดผู้ขาย" : "สมัคร/ดูสถานะผู้ขาย"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isBuyerOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-5 text-primary" aria-hidden />
                  คำสั่งซื้อของฉัน
                </CardTitle>
                <CardDescription>ติดตามสถานะคำสั่งซื้อ</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/orders">ดูคำสั่งซื้อ</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isBuyerOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="size-5 text-primary" aria-hidden />
                  สมุดที่อยู่
                </CardTitle>
                <CardDescription>จัดการที่อยู่จัดส่งสินค้า</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/addresses">จัดการที่อยู่</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-5 text-primary" aria-hidden />
                  แผงควบคุมผู้ดูแลระบบ
                </CardTitle>
                <CardDescription>กลับไปยังแผงควบคุมผู้ดูแลระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href="/admin">ไปแผงควบคุม</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <LogoutButton variant="ghost" className="w-full" />
        </div>
      </div>
    </div>
  );
}
