import { z } from "zod";

export const checkoutSchema = z.object({
  address_id: z.string().uuid("กรุณาเลือกที่อยู่จัดส่ง"),
  payment_method: z.enum(["cod", "promptpay"], {
    message: "กรุณาเลือกวิธีชำระเงิน",
  }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
