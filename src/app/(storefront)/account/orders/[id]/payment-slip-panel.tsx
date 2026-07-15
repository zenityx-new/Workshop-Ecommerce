"use client";

/* eslint-disable @next/next/no-img-element -- PromptPay QR is a server-generated data: URL, not an optimizable asset */

import { useActionState } from "react";
import { AlertCircle, UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { submitPaymentSlip } from "@/lib/actions/orders";
import { formatTHB } from "@/lib/format";
import type { ActionState } from "@/lib/actions/auth";
import type { Enums } from "@/lib/supabase/database.types";

const initial: ActionState = {};

export function PaymentSlipPanel({
  orderId,
  amount,
  qrDataUrl,
  paymentStatus,
  rejectReason,
  slipUrl,
}: {
  orderId: string;
  amount: number;
  qrDataUrl: string | null;
  paymentStatus: Enums<"payment_status">;
  rejectReason: string | null;
  slipUrl: string | null;
}) {
  const action = submitPaymentSlip.bind(null, orderId);
  const [state, formAction] = useActionState(action, initial);

  const canUpload = paymentStatus === "unpaid" || paymentStatus === "rejected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          ชำระเงินผ่าน PromptPay
          <PaymentStatusBadge status={paymentStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentStatus === "rejected" && rejectReason && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>สลิปถูกปฏิเสธ: {rejectReason} กรุณาอัปโหลดสลิปใหม่</AlertDescription>
          </Alert>
        )}

        {paymentStatus === "submitted" && (
          <Alert>
            <UploadCloud aria-hidden />
            <AlertDescription>ส่งสลิปแล้ว รอร้านค้าตรวจสอบการชำระเงิน</AlertDescription>
          </Alert>
        )}

        {canUpload && qrDataUrl && (
          <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
            <img src={qrDataUrl} alt="PromptPay QR" width={220} height={220} />
            <p className="text-lg font-semibold text-primary">{formatTHB(amount)}</p>
            <p className="text-xs text-muted-foreground">สแกนเพื่อชำระเงินผ่านแอปธนาคาร</p>
          </div>
        )}
        {canUpload && !qrDataUrl && (
          <Alert variant="warning">
            <AlertCircle aria-hidden />
            <AlertDescription>
              ร้านค้ายังไม่ได้ตั้งค่าเลขพร้อมเพย์ กรุณาติดต่อร้านค้าเพื่อชำระเงิน
            </AlertDescription>
          </Alert>
        )}

        {slipUrl && !canUpload && (
          <p className="text-sm text-muted-foreground">อัปโหลดสลิปแล้ว รอผลการตรวจสอบ</p>
        )}

        {canUpload && (
          <form action={formAction} className="space-y-3">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div>
              <input
                type="file"
                name="slip"
                accept="image/jpeg,image/png,image/webp"
                required
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
            </div>
            <SubmitButton pendingText="กำลังอัปโหลด...">แนบสลิปการโอนเงิน</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
