"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Mail,
  Package,
  Store,
  History,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { warnShop, suspendShop, unsuspendShop } from "@/lib/actions/moderation";
import { formatDateTime } from "@/lib/format";
import type { ActionState } from "@/lib/actions/auth";

export type ShopWarning = { id: string; reason: string; created_at: string };

export type AdminShop = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  suspend_reason: string | null;
  ownerName: string;
  ownerEmail: string | null;
  productCount: number;
  warnings: ShopWarning[];
};

const initial: ActionState = {};

// Shared reason-collecting dialog for warn / suspend (both require a reason).
function ReasonDialog({
  action,
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant,
  placeholder,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="reason">เหตุผล</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder={placeholder}
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.reason}
                required
              />
              <FieldError messages={state.fieldErrors?.reason} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton variant={confirmVariant} pendingText="กำลังบันทึก...">
                {confirmLabel}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ShopRow({ shop }: { shop: AdminShop }) {
  const isSuspended = shop.status === "suspended";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Store className="size-4 text-primary" aria-hidden />
            <span className="font-medium">{shop.name}</span>
            <Badge variant={isSuspended ? "destructive" : "success"}>
              {isSuspended ? "ถูกระงับ" : "เปิดขาย"}
            </Badge>
            {shop.warnings.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="size-3.5" aria-hidden />
                ตักเตือน {shop.warnings.length} ครั้ง
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="size-3.5" aria-hidden />
              {shop.ownerName}
              {shop.ownerEmail ? ` (${shop.ownerEmail})` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Package className="size-3.5" aria-hidden />
              {shop.productCount} สินค้า
            </span>
          </div>

          {isSuspended && shop.suspend_reason && (
            <Alert variant="destructive" className="mt-1">
              <Ban aria-hidden />
              <AlertDescription>
                <span className="font-medium">เหตุผลการระงับ:</span>{" "}
                {shop.suspend_reason}
              </AlertDescription>
            </Alert>
          )}

          {shop.warnings.length > 0 && (
            <details className="text-xs">
              <summary className="flex cursor-pointer items-center gap-1 text-muted-foreground">
                <History className="size-3.5" aria-hidden />
                ประวัติการตักเตือน
              </summary>
              <ul className="mt-2 space-y-1.5 border-l-2 border-muted pl-3">
                {shop.warnings.map((w) => (
                  <li key={w.id}>
                    <span className="text-muted-foreground">
                      {formatDateTime(w.created_at)}
                    </span>
                    <span className="block">{w.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <ReasonDialog
            action={warnShop.bind(null, shop.id)}
            trigger={
              <Button type="button" variant="outline" size="sm">
                <AlertTriangle aria-hidden />
                ตักเตือน
              </Button>
            }
            title={`ตักเตือนร้าน "${shop.name}"`}
            description="ร้านค้าจะเห็นการตักเตือนนี้ในระบบผู้ขาย"
            confirmLabel="บันทึกการตักเตือน"
            placeholder="เช่น มีการตั้งราคาสินค้าที่ทำให้เข้าใจผิด กรุณาแก้ไข"
          />

          {isSuspended ? (
            <ConfirmSubmitButton
              action={unsuspendShop.bind(null, shop.id)}
              triggerLabel="ปลดระงับ"
              triggerVariant="default"
              title={`ปลดระงับร้าน "${shop.name}"`}
              description="ร้านค้าและสินค้าทั้งหมดจะกลับมาแสดงในหน้าซื้อทันที"
              confirmLabel="ปลดระงับ"
            />
          ) : (
            <ReasonDialog
              action={suspendShop.bind(null, shop.id)}
              trigger={
                <Button type="button" variant="destructive" size="sm">
                  <Ban aria-hidden />
                  ระงับร้าน
                </Button>
              }
              title={`ระงับร้าน "${shop.name}"`}
              description="สินค้าทั้งหมดจะหายจากหน้าซื้อทันที และผู้ขายจะเห็นเฉพาะหน้าเหตุผล"
              confirmLabel="ยืนยันระงับร้าน"
              confirmVariant="destructive"
              placeholder="เช่น ขายสินค้าผิดกฎหมาย / ได้รับการร้องเรียนหลายครั้ง"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
