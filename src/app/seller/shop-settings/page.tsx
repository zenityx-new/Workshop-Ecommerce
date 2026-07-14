import { Store } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ShopSettingsForm } from "./shop-settings-form";

export const metadata = { title: "ตั้งค่าร้านค้า" };

export default async function ShopSettingsPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, description, promptpay_id, logo_url, banner_url")
    .eq("owner_id", user!.id)
    .single();

  const logoUrl = shop?.logo_url
    ? supabase.storage.from("shops").getPublicUrl(shop.logo_url).data.publicUrl
    : null;
  const bannerUrl = shop?.banner_url
    ? supabase.storage.from("shops").getPublicUrl(shop.banner_url).data.publicUrl
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ตั้งค่าร้านค้า</h1>
          <p className="text-sm text-muted-foreground">
            ชื่อร้าน โลโก้ แบนเนอร์ และเลขพร้อมเพย์รับเงิน
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลร้านค้า</CardTitle>
          <CardDescription>ข้อมูลนี้จะแสดงในหน้าร้านของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <ShopSettingsForm
            name={shop?.name ?? ""}
            description={shop?.description ?? ""}
            promptpayId={shop?.promptpay_id ?? ""}
            logoUrl={logoUrl}
            bannerUrl={bannerUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
