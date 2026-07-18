import { z } from "zod";

export const reviewSchema = z.object({
  order_item_id: z.string().uuid("ไม่พบรายการสินค้านี้"),
  rating: z.coerce.number().int().min(1, "กรุณาให้คะแนน 1-5 ดาว").max(5, "กรุณาให้คะแนน 1-5 ดาว"),
  comment: z.string().trim().max(1000, "ความคิดเห็นยาวเกินไป").optional().or(z.literal("")),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const replySchema = z.object({
  review_id: z.string().uuid("ไม่พบรีวิวนี้"),
  reply: z.string().trim().min(1, "กรุณากรอกข้อความตอบกลับ").max(1000, "ข้อความยาวเกินไป"),
});
export type ReplyInput = z.infer<typeof replySchema>;
