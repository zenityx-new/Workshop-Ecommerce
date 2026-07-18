import Link from "next/link";
import Image from "next/image";
import {
  UserRound,
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
import { ProfileForm } from "./profile-form";

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

  const displayName = profile.full_name || user!.email || "ผู้ใช้";

  // Buyer-only: gather dashboard data (orders, wishlist, addresses).
  let dashboard: {
    total: number;
    active: number;
    toConfirm: number;
    completed: number;
    spent: number;
    wishlist: number;
    addresses: number;
    recent: {
      id: string;
      order_no: string;
      total: number;
      status: Enums<"order_status">;
      created_at: string;
      shops: { name: string } | null;
    }[];
  } | null = null;

  if (isBuyerOnly) {
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

    const all = orders ?? [];
    dashboard = {
      total: all.length,
      active: all.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      toConfirm: all.filter((o) => o.status === "delivered").length,
      completed: all.filter((o) => o.status === "completed").length,
      spent: all
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + Number(o.total ?? 0), 0),
      wishlist: wishlistCount ?? 0,
      addresses: addressCount ?? 0,
      recent: all.slice(0, 5),
    };
  }

  // ---------- Profile hero (shared) ----------
  const hero = (
    <Card className="overflow-hidden p-0">
      <div className="relative h-28 w-full bg-gradient-to-r from-primary/25 via-primary/10 to-primary/20 sm:h-36">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="100vw"
          />
        )}
      </div>
      <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <div className="-mt-10 size-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted sm:-mt-12 sm:size-24">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={96}
                height={96}
                className="size-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <UserRound className="size-9" aria-hidden />
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl font-bold sm:text-2xl">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user!.email}</p>
          </div>
        </div>
      </div>
    </Card>
  );

  // ---------- Non-buyer (seller/admin): keep the minimal profile view ----------
  if (!isBuyerOnly) {
    return (
      <div className="space-y-6">
        {hero}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              <CardDescription>แก้ไขชื่อ เบอร์ติดต่อ และรูปโปรไฟล์ของคุณ</CardDescription>
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
        </div>
      </div>
    );
  }

  // ---------- Buyer dashboard ----------
  const stats = [
    {
      icon: ShoppingBag,
      label: "คำสั่งซื้อทั้งหมด",
      value: dashboard!.total,
      tint: "text-primary",
    },
    {
      icon: Truck,
      label: "กำลังดำเนินการ",
      value: dashboard!.active,
      tint: "text-primary",
    },
    {
      icon: PackageCheck,
      label: "รอยืนยันรับสินค้า",
      value: dashboard!.toConfirm,
      tint: "text-success",
    },
    {
      icon: Banknote,
      label: "ยอดใช้จ่าย",
      value: formatTHB(dashboard!.spent),
      tint: "text-primary",
    },
  ];

  const shortcuts = [
    { icon: ShoppingCart, label: "เลือกซื้อสินค้า", href: "/products", hint: "เลือกดูสินค้าทั้งหมด" },
    { icon: Package, label: "คำสั่งซื้อของฉัน", href: "/account/orders", hint: `${dashboard!.total} รายการ` },
    { icon: Heart, label: "รายการโปรด", href: "/wishlist", hint: `${dashboard!.wishlist} รายการ` },
    { icon: MapPin, label: "สมุดที่อยู่", href: "/account/addresses", hint: `${dashboard!.addresses} ที่อยู่` },
  ];

  return (
    <div className="space-y-6">
      {hero}

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
            {dashboard!.total > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/account/orders">
                  ดูทั้งหมด
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {dashboard!.recent.length === 0 ? (
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
                {dashboard!.recent.map((order) => (
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

      {/* Profile settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-5 text-primary" aria-hidden />
            ข้อมูลส่วนตัว
          </CardTitle>
          <CardDescription>แก้ไขชื่อ เบอร์ติดต่อ และรูปโปรไฟล์ของคุณ</CardDescription>
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

      <LogoutButton variant="ghost" className="w-full" />
    </div>
  );
}
