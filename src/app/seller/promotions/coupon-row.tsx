"use client";

import Link from "next/link";
import { Pencil, Trash2, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteCoupon, toggleCouponActive } from "@/lib/actions/coupon";
import { formatTHB, formatDateTime } from "@/lib/format";

export type CouponRowData = {
  id: string;
  code: string;
  type: "percent" | "amount";
  value: number;
  min_order: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

function statusOf(coupon: CouponRowData): { label: string; variant: "success" | "neutral" | "warning" } {
  if (!coupon.is_active) return { label: "ปิดใช้งาน", variant: "neutral" };
  const now = Date.now();
  if (coupon.starts_at && now < new Date(coupon.starts_at).getTime()) {
    return { label: "ยังไม่เริ่ม", variant: "warning" };
  }
  if (coupon.ends_at && now > new Date(coupon.ends_at).getTime()) {
    return { label: "หมดอายุ", variant: "neutral" };
  }
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    return { label: "ใช้ครบสิทธิ์แล้ว", variant: "neutral" };
  }
  return { label: "ใช้งานอยู่", variant: "success" };
}

export function CouponRow({ coupon }: { coupon: CouponRowData }) {
  const status = statusOf(coupon);
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Ticket aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-mono font-semibold">{coupon.code}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {coupon.type === "percent" ? `ลด ${coupon.value}%` : `ลด ${formatTHB(coupon.value)}`}
            {coupon.min_order > 0 && ` · ขั้นต่ำ ${formatTHB(coupon.min_order)}`}
            {" · "}
            ใช้แล้ว {coupon.used_count}
            {coupon.usage_limit != null ? `/${coupon.usage_limit}` : " ครั้ง (ไม่จำกัด)"}
          </p>
          {(coupon.starts_at || coupon.ends_at) && (
            <p className="text-xs text-muted-foreground">
              {coupon.starts_at ? formatDateTime(coupon.starts_at) : "ไม่มีวันเริ่ม"}
              {" – "}
              {coupon.ends_at ? formatDateTime(coupon.ends_at) : "ไม่มีวันสิ้นสุด"}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/seller/promotions/${coupon.id}/edit`}>
              <Pencil aria-hidden />
              แก้ไข
            </Link>
          </Button>
          <ConfirmSubmitButton
            action={toggleCouponActive.bind(null, coupon.id, !coupon.is_active)}
            triggerLabel={coupon.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            triggerVariant="outline"
            title={coupon.is_active ? "ปิดใช้งานคูปอง" : "เปิดใช้งานคูปอง"}
            description={
              coupon.is_active
                ? `ยืนยันปิดใช้งานคูปอง "${coupon.code}" — ผู้ซื้อจะใช้คูปองนี้ไม่ได้ทันที`
                : `ยืนยันเปิดใช้งานคูปอง "${coupon.code}"`
            }
            confirmLabel="ยืนยัน"
          />
          <ConfirmSubmitButton
            action={deleteCoupon.bind(null, coupon.id)}
            triggerLabel="ลบ"
            triggerIcon={<Trash2 aria-hidden />}
            triggerVariant="destructive"
            title="ลบคูปอง"
            description={`ยืนยันลบคูปอง "${coupon.code}" — การลบไม่สามารถย้อนกลับได้`}
            confirmVariant="destructive"
            confirmLabel="ลบคูปอง"
          />
        </div>
      </CardContent>
    </Card>
  );
}
