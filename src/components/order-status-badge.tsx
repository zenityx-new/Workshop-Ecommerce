import {
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { Enums } from "@/lib/supabase/database.types";

type OrderStatus = Enums<"order_status">;
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const CONFIG: Record<OrderStatus, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  awaiting_payment: { label: "รอชำระเงิน", variant: "warning", icon: Clock },
  pending: { label: "รอดำเนินการ", variant: "warning", icon: Clock },
  confirmed: { label: "ยืนยันแล้ว", variant: "default", icon: CheckCircle2 },
  shipped: { label: "กำลังจัดส่ง", variant: "default", icon: Truck },
  delivered: { label: "จัดส่งถึงแล้ว", variant: "success", icon: PackageCheck },
  completed: { label: "สำเร็จ", variant: "success", icon: CheckCircle2 },
  cancelled: { label: "ยกเลิกแล้ว", variant: "destructive", icon: XCircle },
};

/** Consistent color + icon per order status, used on every buyer/seller order screen. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}
