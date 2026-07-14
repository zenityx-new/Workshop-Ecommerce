"use client";

import { useActionState } from "react";
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

export default function SellerRegisterPage() {
  const [state, formAction] = useActionState(applySeller, initial);

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
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="shop_name">ชื่อร้านค้า</Label>
            <Input
              id="shop_name"
              name="shop_name"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.shop_name}
              required
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
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.id_card_number}
              required
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
              required
            />
            <FieldError messages={state.fieldErrors?.phone} />
          </div>

          <div>
            <Label htmlFor="address">ที่อยู่</Label>
            <Textarea
              id="address"
              name="address"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.address}
              required
            />
            <FieldError messages={state.fieldErrors?.address} />
          </div>

          <div>
            <Label htmlFor="id_card">รูปบัตรประชาชน</Label>
            <Input
              id="id_card"
              name="id_card"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="mt-1.5"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              รองรับ JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 10 MB
            </p>
          </div>

          <div>
            <Label htmlFor="extra_doc">เอกสารเพิ่มเติม (ไม่บังคับ)</Label>
            <Input
              id="extra_doc"
              name="extra_doc"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="mt-1.5"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
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
