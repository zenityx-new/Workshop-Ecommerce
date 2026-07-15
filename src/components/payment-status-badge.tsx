import { Clock, FileClock, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { Enums } from "@/lib/supabase/database.types";

type PaymentStatus = Enums<"payment_status">;
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const CONFIG: Record<PaymentStatus, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  unpaid: { label: "ยังไม่ชำระเงิน", variant: "neutral", icon: Clock },
  submitted: { label: "รอตรวจสอบสลิป", variant: "warning", icon: FileClock },
  verified: { label: "ชำระเงินแล้ว", variant: "success", icon: CheckCircle2 },
  rejected: { label: "สลิปถูกปฏิเสธ", variant: "destructive", icon: XCircle },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}
