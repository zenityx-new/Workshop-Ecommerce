import { z } from "zod";

const phoneRegex = /^0\d{8,9}$/;

export const addressSchema = z.object({
  recipient_name: z.string().trim().min(2, "กรุณากรอกชื่อผู้รับ").max(120),
  phone: z.string().trim().regex(phoneRegex, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"),
  line1: z.string().trim().min(5, "กรุณากรอกที่อยู่ให้ครบถ้วน").max(300),
  sub_district: z.string().trim().max(100).optional().or(z.literal("")),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().min(2, "กรุณากรอกจังหวัด").max(100),
  postal_code: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  is_default: z.coerce.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;
