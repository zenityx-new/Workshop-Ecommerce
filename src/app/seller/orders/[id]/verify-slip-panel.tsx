"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { approvePaymentSlip, rejectPaymentSlip } from "@/lib/actions/seller-orders";
import type { ActionState } from "@/lib/actions/auth";
import type { Enums } from "@/lib/supabase/database.types";

const initial: ActionState = {};

function RejectSlipDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const action = rejectPaymentSlip.bind(null, orderId);
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <XCircle aria-hidden />
        ปฏิเสธสลิป
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธสลิปการชำระเงิน</DialogTitle>
            <DialogDescription>ระบุเหตุผล ผู้ซื้อจะเห็นเหตุผลนี้และอัปโหลดสลิปใหม่ได้</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="reject-reason">เหตุผล</Label>
              <Textarea
                id="reject-reason"
                name="reason"
                placeholder="เช่น ยอดโอนไม่ตรงกับยอดสั่งซื้อ"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.reason}
                required
              />
              <FieldError messages={state.fieldErrors?.reason} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton variant="destructive" pendingText="กำลังปฏิเสธ...">
                ยืนยันปฏิเสธ
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function VerifySlipPanel({
  orderId,
  paymentStatus,
  slipSignedUrl,
  rejectReason,
}: {
  orderId: string;
  paymentStatus: Enums<"payment_status">;
  slipSignedUrl: string | null;
  rejectReason: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          สลิปการชำระเงิน
          <PaymentStatusBadge status={paymentStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {paymentStatus === "rejected" && rejectReason && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>เหตุผลที่ปฏิเสธ: {rejectReason}</AlertDescription>
          </Alert>
        )}
        {slipSignedUrl ? (
          <a
            href={slipSignedUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            เปิดดูสลิปการโอนเงิน
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">ผู้ซื้อยังไม่ได้อัปโหลดสลิป</p>
        )}
        {paymentStatus === "submitted" && (
          <div className="flex gap-2 pt-1">
            <ConfirmSubmitButton
              action={approvePaymentSlip.bind(null, orderId)}
              triggerLabel="ยืนยันการชำระเงิน"
              triggerIcon={<CheckCircle2 aria-hidden />}
              triggerVariant="default"
              title="ยืนยันการชำระเงิน"
              description="ยืนยันว่าตรวจสอบสลิปแล้วยอดเงินถูกต้อง คำสั่งซื้อจะเปลี่ยนเป็นรอดำเนินการ"
              confirmLabel="ยืนยัน"
            />
            <RejectSlipDialog orderId={orderId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
