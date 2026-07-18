import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "ชื่อหมวดหมู่ต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(60, "ชื่อหมวดหมู่ต้องไม่เกิน 60 ตัวอักษร"),
  requires_size: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  // Optional — used in storefront filter URLs (?category=slug). Left blank it
  // is derived from the name, falling back to a random suffix for Thai names.
  slug: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9-]*$/, "slug ใช้ได้เฉพาะ a-z, 0-9 และ - เท่านั้น")
    .optional()
    .or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;
