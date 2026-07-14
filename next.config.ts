import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
