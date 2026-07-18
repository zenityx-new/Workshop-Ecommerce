import Link from "next/link";
import {
  Store,
  Package,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  PackageCheck,
  Banknote,
  Heart,
  ShoppingCart,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
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
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatTHB, formatDateTime } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { ProfileHero } from "./profile-hero";

export const metadata = { title: "บัญชีของฉัน" };

const ACTIVE_STATUSES = ["awaiting_payment", "pending", "confirmed", "shipped"];

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

  // The editable profile hero (banner + avatar + name/phone) — shared by every
  // role and the single place profile editing happens.
  const profileHero = (
    <ProfileHero
      email={user!.email ?? ""}
      fullName={profile.full_name ?? ""}
      phone={profile.phone ?? ""}
      avatarUrl={avatarUrl}
      bannerUrl={bannerUrl}
    />
  );

  // ---------- Non-buyer (seller/admin): profile + role shortcut ----------
  if (!isBuyerOnly) {
    return (
      <div className="space-y-6">
        {profileHero}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isSeller ? (
                <Store className="size-5 text-primary" aria-hidden />
              ) : (
                <ShieldCheck className="size-5 text-primary" aria-hidden />
              )}
              {isSeller ? "ร้านค้าของฉัน" : "แผงควบคุมผู้ดูแลระบบ"}
            </CardTitle>
            <CardDescription>
              {isSeller
                ? "ไปยังแดชบอร์ดผู้ขายของคุณ"
                : "กลับไปยังแผงควบคุมผู้ดูแลระบบ"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={isSeller ? "/seller" : "/admin"}>
                {isSeller ? "ไปแดชบอร์ดผู้ขาย" : "ไปแผงควบคุม"}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <LogoutButton variant="ghost" className="w-full" />
      </div>
    );
  }

  // ---------- Buyer dashboard ----------
  const [{ data: orders }, { count: wishlistCount }, { count: addressCount }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, order_no, total, status, created_at, shops(name)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("wishlists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id),
      supabase
        .from("addresses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id),
    ]);

  const all = (orders ?? []) as {
    id: string;
    order_no: string;
    total: number;
    status: Enums<"order_status">;
    created_at: string;
    shops: { name: string } | null;
  }[];

  const spent = all
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total ?? 0), 0);

  const stats = [
    {
      icon: ShoppingBag,
      label: "คำสั่งซื้อทั้งหมด",
      value: all.length,
      tint: "text-primary",
    },
    {
      icon: Truck,
      label: "กำลังดำเนินการ",
      value: all.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      tint: "text-primary",
    },
    {
      icon: PackageCheck,
      label: "รอยืนยันรับสินค้า",
      value: all.filter((o) => o.status === "delivered").length,
      tint: "text-success",
    },
    {
      icon: Banknote,
      label: "ยอดใช้จ่าย",
      value: formatTHB(spent),
      tint: "text-primary",
    },
  ];

  const shortcuts = [
    { icon: ShoppingCart, label: "เลือกซื้อสินค้า", href: "/products", hint: "เลือกดูสินค้าทั้งหมด" },
    { icon: Package, label: "คำสั่งซื้อของฉัน", href: "/account/orders", hint: `${all.length} รายการ` },
    { icon: Heart, label: "รายการโปรด", href: "/wishlist", hint: `${wishlistCount ?? 0} รายการ` },
    { icon: MapPin, label: "สมุดที่อยู่", href: "/account/addresses", hint: `${addressCount ?? 0} ที่อยู่` },
  ];

  const recent = all.slice(0, 5);

  return (
    <div className="space-y-6">
      {profileHero}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <s.icon className={`size-4 ${s.tint}`} aria-hidden />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-5 text-primary" aria-hidden />
                คำสั่งซื้อล่าสุด
              </CardTitle>
              <CardDescription>ติดตามสถานะการจัดส่ง</CardDescription>
            </div>
            {all.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/account/orders">
                  ดูทั้งหมด
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Package className="size-10 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  คุณยังไม่มีคำสั่งซื้อ เริ่มเลือกซื้อสินค้าได้เลย
                </p>
                <Button asChild size="sm">
                  <Link href="/products">เลือกซื้อสินค้า</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{order.shops?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.order_no} · {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-semibold">
                        {formatTHB(order.total)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ทางลัด</CardTitle>
            <CardDescription>เมนูที่ใช้บ่อย</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <LogoutButton variant="ghost" className="w-full" />
    </div>
  );
}
