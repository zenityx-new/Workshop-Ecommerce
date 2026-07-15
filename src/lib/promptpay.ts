import "server-only";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/** Renders a PromptPay QR code as a data: URL PNG for the given receiving ID + amount (THB). */
export async function generatePromptPayQr(promptpayId: string, amount: number): Promise<string> {
  const payload = generatePayload(promptpayId, { amount });
  return QRCode.toDataURL(payload, { width: 320, margin: 1 });
}
