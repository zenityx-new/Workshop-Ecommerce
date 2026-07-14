"use client";

import { useActionState, useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
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
import { rejectSellerApplication } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/auth";

const initial: ActionState = {};

export function RejectApplicationDialog({
  applicationId,
  shopName,
}: {
  applicationId: string;
  shopName: string;
}) {
  const [open, setOpen] = useState(false);
  const action = rejectSellerApplication.bind(null, applicationId);
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <X aria-hidden />
        ปฏิเสธ
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธใบสมัครผู้ขาย</DialogTitle>
            <DialogDescription>
              ระบุเหตุผลการปฏิเสธร้าน &quot;{shopName}&quot; ผู้สมัครจะเห็นเหตุผลนี้
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
              <Label htmlFor={`reason-${applicationId}`}>เหตุผล</Label>
              <Textarea
                id={`reason-${applicationId}`}
                name="reason"
                placeholder="เช่น เอกสารบัตรประชาชนไม่ชัดเจน กรุณาถ่ายใหม่"
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
