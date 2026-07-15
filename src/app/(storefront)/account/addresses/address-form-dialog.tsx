"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, AlertCircle } from "lucide-react";
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
import { createAddress, updateAddress } from "@/lib/actions/address";
import type { ActionState } from "@/lib/actions/auth";
import type { Tables } from "@/lib/supabase/database.types";

const initial: ActionState = {};

export function AddressFormDialog({ address }: { address?: Tables<"addresses"> }) {
  const [open, setOpen] = useState(false);
  const action = address ? updateAddress.bind(null, address.id) : createAddress;
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      {address ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil aria-hidden />
          แก้ไข
        </Button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus aria-hidden />
          เพิ่มที่อยู่ใหม่
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{address ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</DialogTitle>
            <DialogDescription>ใช้สำหรับจัดส่งสินค้า</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="recipient_name">ชื่อผู้รับ</Label>
              <Input
                id="recipient_name"
                name="recipient_name"
                defaultValue={address?.recipient_name}
                placeholder="เช่น สมชาย ใจดี"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.recipient_name}
                required
              />
              <FieldError messages={state.fieldErrors?.recipient_name} />
            </div>

            <div>
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                defaultValue={address?.phone}
                placeholder="0812345678"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.phone}
                required
              />
              <FieldError messages={state.fieldErrors?.phone} />
            </div>

            <div>
              <Label htmlFor="line1">ที่อยู่ (บ้านเลขที่ ถนน หมู่บ้าน)</Label>
              <Input
                id="line1"
                name="line1"
                defaultValue={address?.line1}
                placeholder="เช่น 123/45 หมู่บ้านสุขใจ ถ.สุขุมวิท"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.line1}
                required
              />
              <FieldError messages={state.fieldErrors?.line1} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sub_district">ตำบล/แขวง</Label>
                <Input
                  id="sub_district"
                  name="sub_district"
                  defaultValue={address?.sub_district ?? ""}
                  placeholder="ตำบล/แขวง"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="district">อำเภอ/เขต</Label>
                <Input
                  id="district"
                  name="district"
                  defaultValue={address?.district ?? ""}
                  placeholder="อำเภอ/เขต"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="province">จังหวัด</Label>
                <Input
                  id="province"
                  name="province"
                  defaultValue={address?.province}
                  placeholder="เช่น กรุงเทพมหานคร"
                  className="mt-1.5"
                  aria-invalid={!!state.fieldErrors?.province}
                  required
                />
                <FieldError messages={state.fieldErrors?.province} />
              </div>
              <div>
                <Label htmlFor="postal_code">รหัสไปรษณีย์</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  inputMode="numeric"
                  defaultValue={address?.postal_code}
                  placeholder="10110"
                  className="mt-1.5"
                  aria-invalid={!!state.fieldErrors?.postal_code}
                  required
                />
                <FieldError messages={state.fieldErrors?.postal_code} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_default"
                value="true"
                defaultChecked={address?.is_default ?? false}
                className="size-4 rounded border-input"
              />
              ตั้งเป็นที่อยู่หลัก
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton pendingText="กำลังบันทึก...">บันทึกที่อยู่</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
