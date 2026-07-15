import Link from "next/link";
import {
  Store,
  ShoppingCart,
  UserRound,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Heart,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CartBadge } from "@/components/cart-badge";

export async function SiteHeader() {
  const { user, profile } = await getSessionUser();

  let dbCartCount = 0;
  if (user) {
    const supabase = await createClient();
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cart) {
      const { data: items } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("cart_id", cart.id);
      dbCartCount = (items ?? []).reduce((sum, i) => sum + i.quantity, 0);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Store className="size-6 text-primary" aria-hidden />
          <span className="text-lg">ตลาดออนไลน์</span>
        </Link>

        <nav className="flex items-center gap-1.5 text-sm">
          {user && (
            <Button asChild variant="ghost" size="icon" aria-label="รายการโปรด">
              <Link href="/wishlist">
                <Heart aria-hidden />
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" aria-label="ตะกร้าสินค้า" className="relative">
            <Link href="/cart">
              <ShoppingCart aria-hidden />
              <CartBadge dbCount={dbCartCount} isLoggedIn={!!user} />
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
