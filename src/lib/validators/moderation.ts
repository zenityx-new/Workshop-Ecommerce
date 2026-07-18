import { z } from "zod";

export const warnShopSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร")
    .max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร"),
});
export type WarnShopInput = z.infer<typeof warnShopSchema>;

export const suspendShopSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร")
    .max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร"),
});
export type SuspendShopInput = z.infer<typeof suspendShopSchema>;
