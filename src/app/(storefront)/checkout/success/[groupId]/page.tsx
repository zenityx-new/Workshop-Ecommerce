import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generatePromptPayQr } from "@/lib/promptpay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaymentSlipPanel } from "@/app/(storefront)/account/orders/[id]/payment-slip-panel";
import { formatTHB } from "@/lib/format";

export const metadata = { title: "สั่งซื้อสำเร็จ" };

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_no, total, status, payment_method, shops(name, slug, promptpay_id), payments(*)",
    )
    .eq("checkout_group_id", groupId)
    .eq("buyer_id", user!.id)
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) notFound();

  const orderCards = await Promise.all(
    orders.map(async (order) => {
      const payment = order.payments?.[0] ?? null;
      const needsPayment =
        order.payment_method === "promptpay" &&
        order.status === "awaiting_payment" &&
        payment &&
        (payment.status === "unpaid" || payment.status === "rejected");
      const qrDataUrl =
        needsPayment && order.shops?.promptpay_id
          ? await generatePromptPayQr(order.shops.promptpay_id, Number(order.total))
          : null;
      return { order, payment, qrDataUrl };
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">สั่งซื้อสำเร็จ</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length > 1
            ? `คำสั่งซื้อของคุณถูกแยกเป็น ${orders.length} รายการตามร้านค้า`
            : "ขอบคุณสำหรับการสั่งซื้อ"}
        </p>
      </div>

      <div className="space-y-4">
        {orderCards.map(({ order, payment, qrDataUrl }) => (
          <div key={order.id} className="space-y-3">
            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{order.shops?.name}</p>
                  <p className="text-sm text-muted-foreground">เลขที่ {order.order_no}</p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {formatTHB(order.total)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <OrderStatusBadge status={order.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/account/orders/${order.id}`}>
                      ดูรายละเอียด
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {order.payment_method === "promptpay" && payment && (
              <PaymentSlipPanel
                orderId={order.id}
                amount={Number(order.total)}
                qrDataUrl={qrDataUrl}
                paymentStatus={payment.status}
                rejectReason={payment.reject_reason}
                slipUrl={payment.slip_url}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Button asChild variant="outline">
          <Link href="/products">เลือกซื้อสินค้าต่อ</Link>
        </Button>
        <Button asChild>
          <Link href="/account/orders">ไปหน้าคำสั่งซื้อของฉัน</Link>
        </Button>
      </div>
    </div>
  );
}
