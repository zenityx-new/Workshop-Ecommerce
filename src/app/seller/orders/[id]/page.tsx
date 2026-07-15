import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Truck, CheckCircle2, PackageCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { CancelOrderDialog } from "@/components/cancel-order-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { confirmOrder, markDelivered } from "@/lib/actions/seller-orders";
import { formatTHB, formatDateTime } from "@/lib/format";
import { ShipOrderDialog } from "./ship-order-dialog";
import { VerifySlipPanel } from "./verify-slip-panel";

export const metadata = { title: "รายละเอียดคำสั่งซื้อ" };

const HISTORY_LABEL: Record<string, string> = {
  awaiting_payment: "รอชำระเงิน",
  pending: "รอดำเนินการ",
  confirmed: "ร้านค้ายืนยันคำสั่งซื้อ",
  shipped: "จัดส่งสินค้าแล้ว",
  delivered: "จัดส่งถึงแล้ว",
  completed: "คำสั่งซื้อสำเร็จ",
  cancelled: "ยกเลิกคำสั่งซื้อ",
};

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user!.id).single();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("shop_id", shop?.id ?? "")
    .maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: history }, { data: payment }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("payments").select("*").eq("order_id", id).maybeSingle(),
  ]);

  let slipSignedUrl: string | null = null;
  if (payment?.slip_url) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("payment-slips").createSignedUrl(payment.slip_url, 300);
    slipSignedUrl = data?.signedUrl ?? null;
  }

  const canCancel = order.status === "pending" || order.status === "confirmed";
  const hasAction = canCancel || order.status === "shipped";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/seller/orders" aria-label="กลับ" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">คำสั่งซื้อ {order.order_no}</h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">รายการสินค้า</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {(items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name !== "default" && (
                      <p className="text-muted-foreground">ไซส์ {item.variant_name}</p>
                    )}
                    <p className="text-muted-foreground">
                      {formatTHB(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium">{formatTHB(item.line_total)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-primary">{formatTHB(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-5 text-primary" aria-hidden />
                ที่อยู่จัดส่ง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {order.ship_recipient} · {order.ship_phone}
              </p>
              <p className="text-muted-foreground">
                {order.ship_line1}
                {order.ship_sub_district ? ` ต.${order.ship_sub_district}` : ""}
                {order.ship_district ? ` อ.${order.ship_district}` : ""} {order.ship_province}{" "}
                {order.ship_postal_code}
              </p>
              {order.carrier && order.tracking_no && (
                <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="size-4" aria-hidden />
                  ขนส่ง {order.carrier} · เลขพัสดุ {order.tracking_no}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ไทม์ไลน์คำสั่งซื้อ</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {(history ?? []).map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium">{HISTORY_LABEL[h.status] ?? h.status}</p>
                      {h.note && <p className="text-muted-foreground">{h.note}</p>}
                      <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {order.payment_method === "promptpay" && payment && (
            <VerifySlipPanel
              orderId={order.id}
              paymentStatus={payment.status}
              slipSignedUrl={slipSignedUrl}
              rejectReason={payment.reject_reason}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">การจัดการคำสั่งซื้อ</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {order.status === "pending" && (
                <ConfirmSubmitButton
                  action={confirmOrder.bind(null, order.id)}
                  triggerLabel="ยืนยันคำสั่งซื้อ"
                  triggerIcon={<CheckCircle2 aria-hidden />}
                  title="ยืนยันคำสั่งซื้อ"
                  description="ยืนยันว่าร้านค้าพร้อมเตรียมสินค้าสำหรับคำสั่งซื้อนี้"
                  confirmLabel="ยืนยัน"
                />
              )}
              {order.status === "confirmed" && <ShipOrderDialog orderId={order.id} />}
              {order.status === "shipped" && (
                <ConfirmSubmitButton
                  action={markDelivered.bind(null, order.id)}
                  triggerLabel="ยืนยันจัดส่งถึงแล้ว"
                  triggerIcon={<PackageCheck aria-hidden />}
                  title="ยืนยันจัดส่งถึงแล้ว"
                  description="ยืนยันว่าพัสดุถูกจัดส่งถึงผู้ซื้อแล้ว"
                  confirmLabel="ยืนยัน"
                />
              )}
              {canCancel && (
                <CancelOrderDialog
                  orderId={order.id}
                  orderNo={order.order_no}
                  revalidatePaths={[`/seller/orders/${order.id}`, "/seller/orders"]}
                />
              )}
              {!hasAction && (
                <p className="text-sm text-muted-foreground">ไม่มีการดำเนินการที่ทำได้ในสถานะนี้</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
