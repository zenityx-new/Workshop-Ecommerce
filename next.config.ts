import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // ค่าเริ่มต้น 1 MB เล็กเกินไปสำหรับฟอร์มที่แนบหลายรูป (โลโก้+แบนเนอร์,
      // สินค้าสูงสุด 8 รูป) — ขยายเผื่อไว้ให้ครอบคลุมทุกฟอร์มอัปโหลดในระบบ
      bodySizeLimit: "50mb",
    },
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
