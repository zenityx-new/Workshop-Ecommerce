"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { AlertCircle, Store } from "lucide-react";
import { applySeller } from "@/lib/actions/seller";
import type { ActionState } from "@/lib/actions/auth";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";

const initial: ActionState = {};

export function SellerRegisterForm() {
  const [state, formAction] = useActionState(applySeller, initial);
  const errorRef = useRef<HTMLDivElement>(null);

  // NOTE: deliberately no `required` on the inputs below. A file input's
  // native "please select a file" bubble (and empty-field bubbles) block the
  // submit silently *before* the action runs — which reads as "I pressed
  // submit and nothing happened". Instead we let the server action validate
  // (Zod for text, explicit checks for the file) and return visible messages.
  // On any returned error we scroll it into view, because it renders at the
  // top of the form while the submit button sits at the bottom — on a phone
  // the message would otherwise appear above the fold and look like nothing
  // happened.
  useEffect(() => {
    if (state.error || state.fieldErrors) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store aria-hidden />
        </div>
        <CardTitle>สมัครเป็นผู้ขาย</CardTitle>
        <CardDescription>
          กรอกข้อมูลและแนบเอกสารเพื่อยืนยันตัวตน ทีมงานจะตรวจสอบและอนุมัติภายหลัง
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div ref={errorRef}>
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label htmlFor="shop_name">ชื่อร้านค้า</Label>
            <Input
              id="shop_name"
              name="shop_name"
              placeholder="เช่น ร้านของสมชาย"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.shop_name}
            />
            <FieldError messages={state.fieldErrors?.shop_name} />
          </div>

          <div>
            <Label htmlFor="id_card_number">เลขบัตรประชาชน (13 หลัก)</Label>
            <Input
              id="id_card_number"
              name="id_card_number"
              inputMode="numeric"
              maxLength={13}
              placeholder="เลขบัตรประชาชน 13 หลัก"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.id_card_number}
            />
            <FieldError messages={state.fieldErrors?.id_card_number} />
          </div>

          <div>
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
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
            <Label htmlFor="address">ที่อยู่</Label>
            <Textarea
              id="address"
              name="address"
              placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.address}
            />
            <FieldError messages={state.fieldErrors?.address} />
          </div>

          <div>
            <Label htmlFor="id_card">รูปบัตรประชาชน</Label>
            <Input
              id="id_card"
              name="id_card"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              รองรับรูปภาพ (JPG, PNG, WebP) หรือ PDF ถ่ายจากมือถือได้ ขนาดไม่เกิน 10 MB
            </p>
          </div>

          <div>
            <Label htmlFor="extra_doc">เอกสารเพิ่มเติม (ไม่บังคับ)</Label>
            <Input
              id="extra_doc"
              name="extra_doc"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
              className="mt-1.5"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          {/* Mirror the error right above the submit button too. The top-of-form
              alert can sit off-screen on a long mobile form — a user who taps
              submit at the bottom would otherwise see "nothing happen". */}
          {(state.error || state.fieldErrors) && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>
                {state.error ?? "กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วนและถูกต้อง"}
              </AlertDescription>
            </Alert>
          )}
          <SubmitButton className="w-full" pendingText="กำลังส่งใบสมัคร...">
            ส่งใบสมัคร
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/account" className="font-medium text-primary hover:underline">
              กลับไปหน้าบัญชี
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
