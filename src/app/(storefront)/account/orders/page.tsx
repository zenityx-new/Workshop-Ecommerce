import Link from "next/link";
import { ArrowLeft, Package, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatTHB, formatDateTime } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata = { title: "คำสั่งซื้อของฉัน" };

type OrderStatus = Enums<"order_status">;

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "active", label: "กำลังดำเนินการ", statuses: ["awaiting_payment", "pending", "confirmed", "shipped"] },
  { key: "delivered", label: "จัดส่งถึงแล้ว", statuses: ["delivered"] },
  { key: "completed", label: "สำเร็จ", statuses: ["completed"] },
  { key: "cancelled", label: "ยกเลิก", statuses: ["cancelled"] },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;
  const { user } = await requireUser();
  const supabase = await createClient();

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  let query = supabase
    .from("orders")
    .select("id, order_no, total, status, payment_method, created_at, shops(name, slug)")
    .eq("buyer_id", user!.id)
    .order("created_at", { ascending: false });
  if (activeTab.statuses) query = query.in("status", activeTab.statuses);

  const { data: orders } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/account" aria-label="กลับ">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">คำสั่งซื้อของฉัน</h1>
          <p className="text-sm text-muted-foreground">ติดตามสถานะคำสั่งซื้อทั้งหมด</p>
        </div>
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/account/orders" : `/account/orders?tab=${t.key}`}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              activeTab.key === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Package className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อในสถานะนี้</p>
            <Button asChild size="sm">
              <Link href="/products">เลือกซื้อสินค้า</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`} className="block">
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ImageOff className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{order.shops?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_no} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-semibold">{formatTHB(order.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
