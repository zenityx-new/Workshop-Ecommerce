import { z } from "zod";

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "รหัสคูปองอย่างน้อย 3 ตัวอักษร")
      .max(30, "รหัสคูปองยาวเกินไป")
      .regex(/^[A-Za-z0-9_-]+$/, "รหัสคูปองใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _"),
    type: z.enum(["percent", "amount"], { message: "กรุณาเลือกประเภทส่วนลด" }),
    value: z.coerce.number().positive("มูลค่าส่วนลดต้องมากกว่า 0"),
    min_order: z.coerce.number().min(0, "ยอดขั้นต่ำต้องไม่ติดลบ"),
    usage_limit: z.coerce.number().int().positive("จำนวนสิทธิ์ต้องมากกว่า 0").nullable(),
    starts_at: z.string().trim().optional().or(z.literal("")),
    ends_at: z.string().trim().optional().or(z.literal("")),
    is_active: z.boolean(),
  })
  .refine((data) => data.type !== "percent" || data.value <= 100, {
    message: "ส่วนลดแบบเปอร์เซ็นต์ต้องไม่เกิน 100",
    path: ["value"],
  })
  .refine(
    (data) =>
      !data.starts_at || !data.ends_at || new Date(data.starts_at) <= new Date(data.ends_at),
    { message: "วันที่เริ่มต้องอยู่ก่อนวันที่สิ้นสุด", path: ["ends_at"] },
  );
export type CouponInput = z.infer<typeof couponSchema>;
