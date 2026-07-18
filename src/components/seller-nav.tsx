"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/seller", label: "แดชบอร์ด" },
  { href: "/seller/products", label: "สินค้า" },
  { href: "/seller/orders", label: "คำสั่งซื้อ" },
  { href: "/seller/promotions", label: "โปรโมชั่น" },
  { href: "/seller/reviews", label: "รีวิว" },
  { href: "/seller/shop-settings", label: "ตั้งค่าร้านค้า" },
];

export function SellerNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      {LINKS.map((link) => {
        const active =
          link.href === "/seller"
            ? pathname === "/seller"
            : pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
