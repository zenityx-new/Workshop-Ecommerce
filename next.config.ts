import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // ค่าเริ่มต้น 1 MB เล็กเกินไปสำหรับฟอร์มที่แนบหลายรูป (โลโก้+แบนเนอร์,
      // สินค้าสูงสุด 8 รูป) — ขยายเผื่อไว้ให้ครอบคลุมทุกฟอร์มอัปโหลดในระบบ
      bodySizeLimit: "50mb",
    },
    // แยกคนละ limit กับ bodySizeLimit ข้างบน — อันนี้คือ cap ของชั้น
    // proxy/middleware (src/proxy.ts) เอง ซึ่ง Next.js ตัดที่ ~10MB โดย
    // ปริยาย "ก่อน" ที่ request จะไปถึง Server Action เสียอีก ทำให้ไฟล์แนบ
    // จริง (เช่นรูปถ่ายบัตรประชาชนจากกล้องมือถือ) ที่เกิน 10MB ถูกตัดกลาง
    // multipart body พอดี ฝั่ง client เห็นเป็น "Unexpected end of form"
    // แบบสุ่มๆ ทั้งที่ bodySizeLimit ของ Server Action เองตั้งไว้สูงแล้ว —
    // proxy.ts รันบนแทบทุก route (matcher ครอบคลุมเกือบทั้งเว็บ) จึงต้อง
    // ยกขีดจำกัดนี้ให้ตรงกันด้วย ไม่งั้นเป็นคอขวดที่ซ่อนอยู่
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    // Cloudflare Workers ไม่มี image optimizer — ปิด optimization
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pxzfnnupgsmgaqnsoxgb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
