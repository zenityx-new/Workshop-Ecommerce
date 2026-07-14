import Link from "next/link";
import {
  Store,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Shirt,
  Footprints,
  Smartphone,
  Sparkles,
  Home,
  UtensilsCrossed,
  Package,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  clothing: Shirt,
  shoes: Footprints,
  electronics: Smartphone,
  "beauty-health": Sparkles,
  "home-living": Home,
  "food-beverage": UtensilsCrossed,
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });

  return (
    <main className="flex-1">
      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Store className="size-6 text-primary" aria-hidden />
            <span className="text-lg">ตลาดออนไลน์</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              สมัครสมาชิก
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            ตลาดออนไลน์รวมร้านค้าหลากหลาย ในที่เดียว
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            เลือกซื้อสินค้าจากผู้ขายที่หลากหลาย ชำระเงินปลายทางหรือพร้อมเพย์
            ติดตามสถานะการจัดส่งได้ทุกขั้นตอน
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ShoppingBag className="size-5" aria-hidden />
              เริ่มเลือกซื้อ
            </Link>
            <Link
              href="/seller/register"
              className="inline-flex items-center gap-2 rounded-md border bg-card px-6 py-3 font-medium transition-colors hover:bg-accent"
            >
              <Store className="size-5" aria-hidden />
              เปิดร้านค้า
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-xl font-semibold sm:text-2xl">หมวดหมู่สินค้า</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          เลือกช้อปตามหมวดหมู่ที่คุณสนใจ
        </p>

        {categories && categories.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? Package;
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-colors hover:border-primary hover:bg-accent"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="text-sm font-medium">{c.name}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
            <Package className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">ยังไม่มีหมวดหมู่สินค้า</p>
          </div>
        )}
      </section>

      {/* Value props */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "ปลอดภัยทุกการซื้อ",
              desc: "ตรวจสอบร้านค้าโดยทีมงานก่อนเปิดขาย",
            },
            {
              icon: Truck,
              title: "ติดตามการจัดส่ง",
              desc: "ดูสถานะและเลขพัสดุได้แบบเรียลไทม์",
            },
            {
              icon: ShoppingBag,
              title: "ชำระเงินยืดหยุ่น",
              desc: "รองรับเก็บเงินปลายทางและพร้อมเพย์",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-2">
            <Store className="size-4" aria-hidden />
            ตลาดออนไลน์หลายร้านค้า
          </span>
          <span>ระบบอยู่ระหว่างการพัฒนา — Phase 0</span>
        </div>
      </footer>
    </main>
  );
}
