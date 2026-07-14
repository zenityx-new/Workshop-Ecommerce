import { z } from "zod";

export const productSchema = z.object({
  category_id: z.string().uuid("กรุณาเลือกหมวดหมู่"),
  name: z.string().trim().min(2, "กรุณากรอกชื่อสินค้าอย่างน้อย 2 ตัวอักษร").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ").max(10_000_000, "ราคาสูงเกินไป"),
  is_active: z.boolean(),
});
export type ProductInput = z.infer<typeof productSchema>;

export type VariantRow = {
  id: string;
  name: string;
  stock: number;
  price: number | null;
};
