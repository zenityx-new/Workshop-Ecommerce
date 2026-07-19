import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// สร้างใหม่ทุกชั่วโมง — ไม่ต้อง regen ทุก request
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const supabase = createAdminClient();

    // เฉพาะสินค้าที่เปิดขายและอยู่ในร้านที่ยัง active
    const { data: products } = await supabase
      .from("products")
      .select("id, updated_at, shops!inner(status)")
      .eq("is_active", true)
      .eq("shops.status", "active")
      .limit(5000);

    const { data: shops } = await supabase
      .from("shops")
      .select("slug, updated_at")
      .eq("status", "active")
      .limit(5000);

    const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
      url: `${SITE_URL}/products/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const shopRoutes: MetadataRoute.Sitemap = (shops ?? []).map((s) => ({
      url: `${SITE_URL}/shops/${s.slug}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...shopRoutes, ...productRoutes];
  } catch {
    // ถ้าต่อ DB ไม่ได้ตอน build อย่างน้อยยังคืน static routes
    return staticRoutes;
  }
}
