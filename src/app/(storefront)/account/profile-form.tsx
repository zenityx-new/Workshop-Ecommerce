"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { updateProfile, type ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";

const initial: ActionState = {};

export function ProfileForm({
  email,
  fullName,
  phone,
}: {
  email: string;
  fullName: string;
  phone: string;
}) {
  const [state, formAction] = useActionState(updateProfile, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && state.notice && (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <AlertDescription>{state.notice}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="email">อีเมล</Label>
        <Input id="email" value={email} className="mt-1.5" disabled readOnly />
        <p className="mt-1 text-xs text-muted-foreground">
          ไม่สามารถเปลี่ยนอีเมลได้
        </p>
      </div>

      <div>
        <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
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

      <SubmitButton pendingText="กำลังบันทึก...">บันทึกข้อมูล</SubmitButton>
    </form>
  );
}
