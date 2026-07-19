import "server-only";

/**
 * ตรวจสิทธิ์ก่อนรัน cron job — รับได้ทั้ง
 *   Authorization: Bearer <CRON_SECRET>   (Cloudflare Cron / curl)
 *   ?secret=<CRON_SECRET>                  (external scheduler ที่ส่ง header ไม่ได้)
 * คืน true เมื่อ secret ตรง — ถ้า CRON_SECRET ไม่ถูกตั้งไว้ ปฏิเสธทุกกรณี
 * (fail-closed) เพื่อไม่ให้ endpoint เปิดโล่งโดยไม่ตั้งใจ
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}
