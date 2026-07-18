import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store, MapPin, Truck, PackageCheck, Star } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generatePromptPayQr } from "@/lib/promptpay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { CancelOrderDialog } from "@/components/cancel-order-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { confirmOrderReceived } from "@/lib/actions/orders";
import { formatTHB, formatDateTime } from "@/lib/format";
import { PaymentSlipPanel } from "./payment-slip-panel";
import { ReviewDialog } from "./review-dialog";

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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, shops(name, slug, promptpay_id)")
    .eq("id", id)
    .eq("buyer_id", user!.id)
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

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: reviews } = itemIds.length
    ? await supabase
        .from("reviews")
        .select("id, order_item_id, rating, comment, seller_reply")
        .in("order_item_id", itemIds)
    : { data: [] as { id: string; order_item_id: string; rating: number; comment: string | null; seller_reply: string | null }[] };
  const reviewByItem = new Map((reviews ?? []).map((r) => [r.order_item_id, r]));

  const needsPayment =
    order.payment_method === "promptpay" &&
    order.status === "awaiting_payment" &&
    payment &&
    (payment.status === "unpaid" || payment.status === "rejected");
  const qrDataUrl =
    needsPayment && order.shops?.promptpay_id
      ? await generatePromptPayQr(order.shops.promptpay_id, Number(order.total))
      : null;

  const canCancel = order.status === "awaiting_payment" || order.status === "pending";
  const canConfirmReceipt = order.status === "delivered";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/account/orders" aria-label="กลับ">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
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
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="size-5 text-primary" aria-hidden />
                <Link href={`/shops/${order.shops?.slug}`} className="hover:text-primary">
                  {order.shops?.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {(items ?? []).map((item) => {
                const review = reviewByItem.get(item.id);
                return (
                  <div key={item.id} className="space-y-2 py-3 text-sm">
                    <div className="flex items-center justify-between">
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

                    {order.status === "completed" && (
                      <div>
                        {review ? (
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="success">
                                <Star className="fill-current" aria-hidden />
                                รีวิวแล้ว {review.rating} ดาว
                              </Badge>
                            </div>
                            {review.comment && (
                              <p className="mt-1.5 text-muted-foreground">{review.comment}</p>
                            )}
                            {review.seller_reply && (
                              <div className="mt-2 rounded-md bg-background p-2">
                                <p className="text-xs font-medium text-primary">
                                  ร้านค้าตอบกลับ
                                </p>
                                <p className="text-muted-foreground">{review.seller_reply}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <ReviewDialog
                            orderId={order.id}
                            orderItemId={item.id}
                            productName={item.product_name}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="space-y-1 pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>ยอดรวมสินค้า</span>
                  <span>{formatTHB(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>ส่วนลด</span>
                    <span>-{formatTHB(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>ค่าจัดส่ง</span>
                  <span>{formatTHB(order.shipping_fee)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                  <span>ยอดรวมทั้งหมด</span>
                  <span className="text-primary">{formatTHB(order.total)}</span>
                </div>
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
          {order.payment_method === "cod" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">การชำระเงิน</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                เก็บเงินปลายทาง (COD) — ชำระเงินเมื่อได้รับสินค้า
              </CardContent>
            </Card>
          ) : (
            payment && (
              <PaymentSlipPanel
                orderId={order.id}
                amount={Number(order.total)}
                qrDataUrl={qrDataUrl}
                paymentStatus={payment.status}
                rejectReason={payment.reject_reason}
                slipUrl={payment.slip_url}
              />
            )
          )}

          {(canCancel || canConfirmReceipt) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">การจัดการคำสั่งซื้อ</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {canConfirmReceipt && (
                  <ConfirmSubmitButton
                    action={confirmOrderReceived.bind(null, order.id)}
                    triggerLabel="ยืนยันรับสินค้า"
                    triggerIcon={<PackageCheck aria-hidden />}
                    triggerVariant="default"
                    title="ยืนยันรับสินค้า"
                    description="ยืนยันว่าคุณได้รับสินค้าครบถ้วนแล้ว คำสั่งซื้อจะถูกปิดเป็นสำเร็จ"
                    confirmLabel="ยืนยันรับสินค้า"
                  />
                )}
                {canCancel && (
                  <CancelOrderDialog
                    orderId={order.id}
                    orderNo={order.order_no}
                    revalidatePaths={[`/account/orders/${order.id}`, "/account/orders"]}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
