import { z } from "zod";

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(5, "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร").max(500),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const shipOrderSchema = z.object({
  carrier: z.string().trim().min(2, "กรุณาระบุขนส่ง").max(80),
  tracking_no: z.string().trim().min(2, "กรุณาระบุเลขพัสดุ").max(80),
});
export type ShipOrderInput = z.infer<typeof shipOrderSchema>;

export const rejectSlipSchema = z.object({
  reason: z.string().trim().min(5, "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร").max(500),
});
export type RejectSlipInput = z.infer<typeof rejectSlipSchema>;
