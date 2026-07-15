import Link from "next/link";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { formatTHB, formatDateTime } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata = { title: "คำสั่งซื้อ" };

type OrderStatus = Enums<"order_status">;

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending", label: "รอยืนยัน", statuses: ["awaiting_payment", "pending"] },
  { key: "confirmed", label: "รอจัดส่ง", statuses: ["confirmed"] },
  { key: "shipped", label: "กำลังจัดส่ง", statuses: ["shipped"] },
  { key: "done", label: "สำเร็จ", statuses: ["delivered", "completed"] },
  { key: "cancelled", label: "ยกเลิก", statuses: ["cancelled"] },
];

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  let orders: {
    id: string;
    order_no: string;
    status: OrderStatus;
    payment_method: Enums<"payment_method">;
    total: number;
    created_at: string;
    ship_recipient: string;
    payments: { status: Enums<"payment_status"> }[] | null;
  }[] = [];

  if (shop) {
    let query = supabase
      .from("orders")
      .select("id, order_no, status, payment_method, total, created_at, ship_recipient, payments(status)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    if (activeTab.statuses) query = query.in("status", activeTab.statuses);
    const { data } = await query;
    orders = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">คำสั่งซื้อ</h1>
        <p className="text-sm text-muted-foreground">จัดการคำสั่งซื้อของร้านคุณ</p>
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/seller/orders" : `/seller/orders?tab=${t.key}`}
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

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Package className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อในสถานะนี้</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const payment = order.payments?.[0];
            return (
              <Link key={order.id} href={`/seller/orders/${order.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{order.order_no}</p>
                      <p className="text-sm text-muted-foreground">
                        ผู้รับ {order.ship_recipient} · {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {order.payment_method === "promptpay" && payment && payment.status === "submitted" && (
                        <PaymentStatusBadge status={payment.status} />
                      )}
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-semibold">{formatTHB(order.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
