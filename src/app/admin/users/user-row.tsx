"use client";

import { ShieldCheck, Ban, ShieldOff, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { setUserStatus, promoteToAdmin } from "@/lib/actions/admin";
import type { Tables } from "@/lib/supabase/database.types";

const ROLE_LABEL: Record<string, string> = {
  buyer: "ผู้ซื้อ",
  seller: "ผู้ขาย",
  admin: "ผู้ดูแลระบบ",
};

export function UserRow({
  profile,
  currentUserId,
}: {
  profile: Tables<"profiles">;
  currentUserId: string;
}) {
  const isSelf = profile.id === currentUserId;
  const isBanned = profile.status === "banned";
  const displayName = profile.full_name || profile.email || "(ไม่ระบุชื่อ)";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{displayName}</span>
            <Badge
              variant={
                profile.role === "admin"
                  ? "default"
                  : profile.role === "seller"
                    ? "success"
                    : "neutral"
              }
            >
              {ROLE_LABEL[profile.role]}
            </Badge>
            <Badge variant={isBanned ? "destructive" : "success"}>
              {isBanned ? "ถูกระงับ" : "ใช้งานได้"}
            </Badge>
            {isSelf && <Badge variant="outline">คุณ</Badge>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {profile.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" aria-hidden />
                {profile.email}
              </span>
            )}
            {profile.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden />
                {profile.phone}
              </span>
            )}
          </div>
        </div>

        {!isSelf && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {profile.role !== "admin" && (
              <ConfirmSubmitButton
                action={promoteToAdmin.bind(null, profile.id)}
                triggerLabel="ตั้งเป็นผู้ดูแลระบบ"
                triggerIcon={<ShieldCheck aria-hidden />}
                triggerVariant="outline"
                title="ตั้งเป็นผู้ดูแลระบบ"
                description={`ยืนยันให้สิทธิ์ผู้ดูแลระบบแก่ "${displayName}" — ผู้ใช้นี้จะสามารถเข้าถึงและจัดการระบบได้ทั้งหมด`}
                confirmLabel="ยืนยันตั้งเป็นผู้ดูแล"
              />
            )}
            {isBanned ? (
              <ConfirmSubmitButton
                action={setUserStatus.bind(null, profile.id, "active")}
                triggerLabel="ปลดระงับ"
                triggerIcon={<ShieldOff aria-hidden />}
                triggerVariant="outline"
                title="ปลดระงับผู้ใช้"
                description={`ยืนยันปลดระงับ "${displayName}" ผู้ใช้จะกลับมาเข้าสู่ระบบได้ตามปกติ`}
                confirmLabel="ปลดระงับ"
              />
            ) : (
              <ConfirmSubmitButton
                action={setUserStatus.bind(null, profile.id, "banned")}
                triggerLabel="ระงับผู้ใช้"
                triggerIcon={<Ban aria-hidden />}
                triggerVariant="destructive"
                title="ระงับผู้ใช้"
                description={`ยืนยันระงับ "${displayName}" ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะปลดระงับ`}
                confirmVariant="destructive"
                confirmLabel="ระงับผู้ใช้"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
