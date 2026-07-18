"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { registerBuyer, type ActionState } from "@/lib/actions/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { SuccessModal } from "@/components/success-modal";

const initial: ActionState = {};

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(registerBuyer, initial);
  const [showNotice, setShowNotice] = useState(false);
  const loginHref = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/login";

  useEffect(() => {
    if (state.notice) setShowNotice(true);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>สมัครสมาชิก</CardTitle>
        <CardDescription>สร้างบัญชีเพื่อเริ่มช้อปปิ้งได้ทันที</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <SuccessModal
            open={showNotice}
            onOpenChange={setShowNotice}
            title="สมัครสมาชิกสำเร็จ"
            description={state.notice}
            autoCloseMs={4000}
          />

          <input type="hidden" name="redirect" value={redirectTo} />

          <div>
            <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="เช่น สมชาย ใจดี"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.full_name}
              required
            />
            <FieldError messages={state.fieldErrors?.full_name} />
          </div>

          <div>
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="เช่น name@email.com"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.email}
              required
            />
            <FieldError messages={state.fieldErrors?.email} />
          </div>

          <div>
            <Label htmlFor="phone">เบอร์โทรศัพท์ (ไม่บังคับ)</Label>
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              placeholder="0812345678"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.phone}
            />
            <FieldError messages={state.fieldErrors?.phone} />
          </div>

          <div>
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.password}
              required
            />
            <FieldError messages={state.fieldErrors?.password} />
            <p className="mt-1 text-xs text-muted-foreground">
              อย่างน้อย 8 ตัวอักษร
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton className="w-full" pendingText="กำลังสมัคร...">
            สมัครสมาชิก
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href={loginHref} className="font-medium text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
