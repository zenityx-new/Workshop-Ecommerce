import { z } from "zod";

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(3, "ชื่อร้านต้องมีอย่างน้อย 3 ตัวอักษร").max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  promptpay_id: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{13}$/, "เลขพร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก")
    .optional()
    .or(z.literal("")),
});
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
