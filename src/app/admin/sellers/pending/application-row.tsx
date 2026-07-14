"use client";

import { Store, Phone, MapPin, CreditCard, FileText, Check, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RejectApplicationDialog } from "./reject-application-dialog";
import { approveSellerApplication } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

export function SellerApplicationRow({
  application,
  idCardUrl,
  extraDocUrl,
}: {
  application: Tables<"seller_applications">;
  idCardUrl: string | null;
  extraDocUrl: string | null;
}) {
  const approveAction = approveSellerApplication.bind(null, application.id);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" aria-hidden />
            <span className="font-semibold">{application.shop_name}</span>
          </div>
          <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {application.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="size-3.5 shrink-0" aria-hidden />
              {application.id_card_number}
            </span>
            <span className="flex items-start gap-1.5 sm:col-span-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {application.address}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            {idCardUrl && (
              <a
                href={idCardUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <FileText className="size-4" aria-hidden />
                ดูรูปบัตรประชาชน
              </a>
            )}
            {extraDocUrl && (
              <a
                href={extraDocUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <FileText className="size-4" aria-hidden />
                เอกสารเพิ่มเติม
              </a>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            ส่งเมื่อ {formatDateTime(application.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <ConfirmSubmitButton
            action={approveAction}
            triggerLabel="อนุมัติ"
            triggerIcon={<Check aria-hidden />}
            triggerVariant="default"
            title="อนุมัติใบสมัครผู้ขาย"
            description={`ยืนยันอนุมัติร้าน "${application.shop_name}" — ระบบจะสร้างร้านค้าและเปลี่ยนสิทธิ์ผู้ใช้เป็นผู้ขายทันที`}
            confirmLabel="อนุมัติ"
          />
          <RejectApplicationDialog
            applicationId={application.id}
            shopName={application.shop_name}
          />
        </div>
      </CardContent>
    </Card>
  );
}
