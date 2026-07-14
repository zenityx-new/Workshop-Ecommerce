import { z } from "zod";

export const rejectApplicationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร")
    .max(500),
});
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;
