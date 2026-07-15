"use client";

import { Star, Trash2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AddressFormDialog } from "./address-form-dialog";
import { deleteAddress, setDefaultAddress } from "@/lib/actions/address";
import type { Tables } from "@/lib/supabase/database.types";

export function AddressCard({ address }: { address: Tables<"addresses"> }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="size-4" aria-hidden />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              {address.recipient_name}
              {address.is_default && (
                <Badge variant="default">
                  <Star aria-hidden />
                  ที่อยู่หลัก
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{address.phone}</p>
            <p className="text-muted-foreground">
              {address.line1}
              {address.sub_district ? ` ต.${address.sub_district}` : ""}
              {address.district ? ` อ.${address.district}` : ""} {address.province}{" "}
              {address.postal_code}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!address.is_default && (
            <ConfirmSubmitButton
              action={setDefaultAddress.bind(null, address.id)}
              triggerLabel="ตั้งเป็นหลัก"
              triggerIcon={<Star aria-hidden />}
              title="ตั้งเป็นที่อยู่หลัก"
              description={`ตั้ง "${address.recipient_name}" เป็นที่อยู่จัดส่งหลักของคุณ`}
            />
          )}
          <AddressFormDialog address={address} />
          <ConfirmSubmitButton
            action={deleteAddress.bind(null, address.id)}
            triggerLabel="ลบ"
            triggerIcon={<Trash2 aria-hidden />}
            triggerVariant="destructive"
            title="ลบที่อยู่นี้?"
            description={`ลบที่อยู่ของ "${address.recipient_name}" การกระทำนี้ไม่สามารถย้อนกลับได้`}
            confirmVariant="destructive"
            confirmLabel="ลบที่อยู่"
          />
        </div>
      </CardContent>
    </Card>
  );
}
