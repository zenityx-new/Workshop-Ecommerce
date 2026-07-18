"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { updateProfile, type ActionState } from "@/lib/actions/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { BrandingPicker } from "@/components/branding-picker";
import { SuccessModal } from "@/components/success-modal";
import { useState } from "react";

/**
 * Editable profile "hero" — banner + avatar (click-to-change) merged with the
 * name/phone fields into one card at the top of /account, so profile editing
 * lives in a single place (no separate form card below). Used for every role.
 */
export function ProfileHero({
  email,
  fullName,
  phone,
  avatarUrl,
  bannerUrl,
}: {
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateProfile, {} as ActionState);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state.success) setShowSuccess(true);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>จัดการโปรไฟล์</CardTitle>
        <CardDescription>
          แก้ไขรูปโปรไฟล์ ภาพปก ชื่อ และเบอร์ติดต่อได้ที่นี่
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SuccessModal
          open={showSuccess}
          onOpenChange={setShowSuccess}
          title="บันทึกข้อมูลสำเร็จ"
          description={state.notice}
        />

        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <BrandingPicker
            label="รูปโปรไฟล์และภาพปก"
            primaryFieldName="avatar"
            primaryUrl={avatarUrl}
            primaryAlt="รูปโปรไฟล์"
            secondaryFieldName="banner"
            secondaryUrl={bannerUrl}
            secondaryAlt="ภาพปก"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={fullName}
                placeholder="เช่น สมชาย ใจดี"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.full_name}
                required
              />
              <FieldError messages={state.fieldErrors?.full_name} />
            </div>

            <div>
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                placeholder="0812345678"
                defaultValue={phone}
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.phone}
              />
              <FieldError messages={state.fieldErrors?.phone} />
            </div>
          </div>

          <div>
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" value={email} className="mt-1.5" disabled readOnly />
            <p className="mt-1 text-xs text-muted-foreground">
              ไม่สามารถเปลี่ยนอีเมลได้
            </p>
          </div>

          <SubmitButton pendingText="กำลังบันทึก...">บันทึกข้อมูล</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
