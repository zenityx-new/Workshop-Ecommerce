import { z } from "zod";

const phoneRegex = /^0\d{8,9}$/;

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(120),
  email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(72),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)")
    .optional()
    .or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const sellerApplicationSchema = z.object({
  shop_name: z.string().trim().min(3, "ชื่อร้านต้องมีอย่างน้อย 3 ตัวอักษร").max(80),
  id_card_number: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),
  phone: z.string().trim().regex(phoneRegex, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"),
  address: z.string().trim().min(10, "กรุณากรอกที่อยู่ให้ครบถ้วน").max(300),
});
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(120),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)")
    .optional()
    .or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;
