"use client";

import { useActionState, useEffect, useState } from "react";
import { Ban, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { cancelOrder } from "@/lib/actions/orders";
import type { ActionState } from "@/lib/actions/auth";

const initial: ActionState = {};

/** Shared cancel-order confirmation used on both the buyer and seller order-detail pages. */
export function CancelOrderDialog({
  orderId,
  orderNo,
  revalidatePaths,
}: {
  orderId: string;
  orderNo: string;
  revalidatePaths: string[];
}) {
  const [open, setOpen] = useState(false);
  const action = cancelOrder.bind(null, orderId, revalidatePaths);
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Ban aria-hidden />
        ยกเลิกคำสั่งซื้อ
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยกเลิกคำสั่งซื้อ {orderNo}</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลการยกเลิก การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor={`cancel-reason-${orderId}`}>เหตุผล</Label>
              <Textarea
                id={`cancel-reason-${orderId}`}
                name="reason"
                placeholder="เช่น สั่งผิดรายการ ต้องการเปลี่ยนที่อยู่จัดส่ง"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.reason}
                required
              />
              <FieldError messages={state.fieldErrors?.reason} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ปิด
              </Button>
              <SubmitButton variant="destructive" pendingText="กำลังยกเลิก...">
                ยืนยันยกเลิก
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
