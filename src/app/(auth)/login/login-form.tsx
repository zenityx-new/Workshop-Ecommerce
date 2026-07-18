"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { login, type ActionState } from "@/lib/actions/auth";
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

export function LoginForm({
  redirectTo,
  banned,
}: {
  redirectTo: string;
  banned: boolean;
}) {
  const [state, formAction] = useActionState(login, initial);
  const [showWelcome, setShowWelcome] = useState(false);
  const registerHref = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";

  useEffect(() => {
    if (state.success) setShowWelcome(true);
  }, [state]);

  function handleWelcomeClose(open: boolean) {
    setShowWelcome(open);
    // Full navigation (not router.push) so every server component down the
    // tree — including the header — re-renders with the new session's role.
    if (!open && state.redirectTo) window.location.href = state.redirectTo;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>เข้าสู่ระบบ</CardTitle>
        <CardDescription>
          ยินดีต้อนรับกลับ กรุณาเข้าสู่ระบบเพื่อใช้งาน
        </CardDescription>
      </CardHeader>

      <SuccessModal
        open={showWelcome}
        onOpenChange={handleWelcomeClose}
        title="เข้าสู่ระบบสำเร็จ"
        description={state.notice}
        autoCloseMs={1500}
      />

      <form action={formAction}>
        <CardContent className="space-y-4">
          {(state.error || banned) && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>
                {state.error ??
                  "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"}
              </AlertDescription>
            </Alert>
          )}

          <input type="hidden" name="redirect" value={redirectTo} />

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
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="กรอกรหัสผ่านของคุณ"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.password}
              required
            />
            <FieldError messages={state.fieldErrors?.password} />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton className="w-full" pendingText="กำลังเข้าสู่ระบบ...">
            เข้าสู่ระบบ
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href={registerHref} className="font-medium text-primary hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
