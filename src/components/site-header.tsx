import Link from "next/link";
import {
  Store,
  ShoppingCart,
  UserRound,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const { user, profile } = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Store className="size-6 text-primary" aria-hidden />
          <span className="text-lg">ตลาดออนไลน์</span>
        </Link>

        <nav className="flex items-center gap-1.5 text-sm">
          <Button asChild variant="ghost" size="icon" aria-label="ตะกร้าสินค้า">
            <Link href="/cart">
              <ShoppingCart aria-hidden />
            </Link>
          </Button>

          {user ? (
            <>
              {profile?.role === "admin" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">
                    <ShieldCheck aria-hidden />
                    ผู้ดูแล
                  </Link>
                </Button>
              )}
              {profile?.role === "seller" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/seller">
                    <LayoutDashboard aria-hidden />
                    ร้านของฉัน
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">
                  <UserRound aria-hidden />
                  บัญชี
                </Link>
              </Button>
              <form action={logout}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="ออกจากระบบ"
                >
                  <LogOut aria-hidden />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">สมัครสมาชิก</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
