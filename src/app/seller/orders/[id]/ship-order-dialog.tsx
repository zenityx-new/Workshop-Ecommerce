"use client";

import { useActionState, useEffect, useState } from "react";
import { Truck, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { shipOrder } from "@/lib/actions/seller-orders";
import type { ActionState } from "@/lib/actions/auth";

const initial: ActionState = {};

export function ShipOrderDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const action = shipOrder.bind(null, orderId);
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Truck aria-hidden />
        จัดส่งสินค้า
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>จัดส่งสินค้า</DialogTitle>
            <DialogDescription>ระบุขนส่งและเลขพัสดุเพื่อยืนยันการจัดส่ง</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="carrier">บริษัทขนส่ง</Label>
              <Input
                id="carrier"
                name="carrier"
                placeholder="เช่น Kerry Express, Flash Express, ไปรษณีย์ไทย"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.carrier}
                required
              />
              <FieldError messages={state.fieldErrors?.carrier} />
            </div>
            <div>
              <Label htmlFor="tracking_no">เลขพัสดุ</Label>
              <Input
                id="tracking_no"
                name="tracking_no"
                placeholder="เช่น TH0123456789"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.tracking_no}
                required
              />
              <FieldError messages={state.fieldErrors?.tracking_no} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton pendingText="กำลังบันทึก...">ยืนยันจัดส่ง</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
