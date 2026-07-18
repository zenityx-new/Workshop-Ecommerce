"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { updateShopSettings } from "@/lib/actions/shop";
import type { ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { BrandingPicker } from "@/components/branding-picker";
import { SuccessModal } from "@/components/success-modal";

const initial: ActionState = {};

export function ShopSettingsForm({
  name,
  description,
  promptpayId,
  logoUrl,
  bannerUrl,
}: {
  name: string;
  description: string;
  promptpayId: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateShopSettings, initial);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state.success) setShowSuccess(true);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <SuccessModal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        title="บันทึกการตั้งค่าสำเร็จ"
        description={state.notice}
      />

      <BrandingPicker
        label="รูปโปรไฟล์ร้านค้า"
        primaryFieldName="logo"
        primaryUrl={logoUrl}
        primaryAlt="โลโก้ร้านค้า"
        secondaryFieldName="banner"
        secondaryUrl={bannerUrl}
        secondaryAlt="แบนเนอร์ร้านค้า"
      />

      <div>
        <Label htmlFor="name">ชื่อร้านค้า</Label>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          placeholder="เช่น ร้านของสมชาย"
          className="mt-1.5"
          aria-invalid={!!state.fieldErrors?.name}
          required
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="description">คำอธิบายร้านค้า</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={description}
          placeholder="แนะนำร้านค้าของคุณสั้น ๆ ให้ผู้ซื้อรู้จัก"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="promptpay_id">เลขพร้อมเพย์รับเงิน</Label>
        <Input
          id="promptpay_id"
          name="promptpay_id"
          inputMode="numeric"
          defaultValue={promptpayId}
          placeholder="เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก"
          className="mt-1.5"
          aria-invalid={!!state.fieldErrors?.promptpay_id}
        />
        <FieldError messages={state.fieldErrors?.promptpay_id} />
      </div>

      <SubmitButton pendingText="กำลังบันทึก...">บันทึกการตั้งค่า</SubmitButton>
    </form>
  );
}
