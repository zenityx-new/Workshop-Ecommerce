"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import type { ActionState } from "@/lib/actions/auth";

const initial: ActionState = {};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function CouponForm({
  action,
  submitLabel,
  pendingText,
  initialCoupon,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingText: string;
  initialCoupon?: {
    code: string;
    type: "percent" | "amount";
    value: number;
    min_order: number;
    usage_limit: number | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
  };
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดคูปอง</CardTitle>
          <CardDescription>รหัสคูปองและมูลค่าส่วนลด</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="code">รหัสคูปอง</Label>
            <Input
              id="code"
              name="code"
              defaultValue={initialCoupon?.code}
              placeholder="เช่น SAVE100"
              className="mt-1.5 uppercase"
              aria-invalid={!!state.fieldErrors?.code}
              required
            />
            <FieldError messages={state.fieldErrors?.code} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">ประเภทส่วนลด</Label>
              <div className="mt-1.5">
                <Select
                  id="type"
                  name="type"
                  defaultValue={initialCoupon?.type ?? "percent"}
                  aria-invalid={!!state.fieldErrors?.type}
                  required
                >
                  <option value="percent">เปอร์เซ็นต์ (%)</option>
                  <option value="amount">จำนวนเงิน (บาท)</option>
                </Select>
              </div>
              <FieldError messages={state.fieldErrors?.type} />
            </div>
            <div>
              <Label htmlFor="value">มูลค่าส่วนลด</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={initialCoupon?.value}
                placeholder="เช่น 10 หรือ 100"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.value}
                required
              />
              <FieldError messages={state.fieldErrors?.value} />
            </div>
          </div>

          <div>
            <Label htmlFor="min_order">ยอดสั่งซื้อขั้นต่ำ (บาท)</Label>
            <Input
              id="min_order"
              name="min_order"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialCoupon?.min_order ?? 0}
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.min_order}
            />
            <FieldError messages={state.fieldErrors?.min_order} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>เงื่อนไขการใช้งาน</CardTitle>
          <CardDescription>จำกัดจำนวนสิทธิ์และช่วงเวลาการใช้คูปอง (ไม่บังคับ)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="usage_limit">จำนวนสิทธิ์การใช้</Label>
            <Input
              id="usage_limit"
              name="usage_limit"
              type="number"
              min="1"
              step="1"
              defaultValue={initialCoupon?.usage_limit ?? ""}
              placeholder="ไม่จำกัด"
              className="mt-1.5 max-w-40"
              aria-invalid={!!state.fieldErrors?.usage_limit}
            />
            <FieldError messages={state.fieldErrors?.usage_limit} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="starts_at">วันที่เริ่มใช้งาน</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="date"
                defaultValue={toDateInputValue(initialCoupon?.starts_at)}
                className="mt-1.5"
              />
              <FieldError messages={state.fieldErrors?.starts_at} />
            </div>
            <div>
              <Label htmlFor="ends_at">วันที่สิ้นสุด</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="date"
                defaultValue={toDateInputValue(initialCoupon?.ends_at)}
                className="mt-1.5"
              />
              <FieldError messages={state.fieldErrors?.ends_at} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initialCoupon?.is_active ?? true}
              className="size-4 rounded border-input"
            />
            เปิดใช้งานคูปองนี้ทันที
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button asChild variant="outline">
          <Link href="/seller/promotions">ยกเลิก</Link>
        </Button>
        <SubmitButton pendingText={pendingText}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
