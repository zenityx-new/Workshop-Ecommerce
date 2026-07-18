"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "แดชบอร์ด" },
  { href: "/admin/sellers/pending", label: "ผู้ขายรออนุมัติ" },
  { href: "/admin/shops", label: "ร้านค้า" },
  { href: "/admin/users", label: "จัดการผู้ใช้" },
  { href: "/admin/categories", label: "หมวดหมู่" },
  { href: "/admin/audit-logs", label: "ประวัติการดำเนินการ" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
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
