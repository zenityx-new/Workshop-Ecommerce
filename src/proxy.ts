import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy-client";

/**
 * Role guard (Next 16 proxy, formerly middleware).
 *   /account/*  -> any signed-in user
 *   /seller/*   -> approved seller (role = seller); pending/rejected -> /seller/pending
 *   /admin/*    -> admin only
 * Also refreshes the Supabase auth session cookie on every matched request.
 */
export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createProxyClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isGuarded =
    path.startsWith("/account") ||
    path.startsWith("/seller") ||
    path.startsWith("/admin");

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Not signed in
  if (!user) {
    if (isGuarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?redirect=${encodeURIComponent(path)}`;
      return NextResponse.redirect(url);
    }
    return getResponse();
  }

  // Signed in — resolve role/status
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "buyer";

  if (profile?.status === "banned" && isGuarded) {
    return redirectTo("/login");
  }

  // Keep signed-in users out of the auth screens
  if (path === "/login" || path === "/register") {
    return redirectTo(role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/");
  }

  // Admin area
  if (path.startsWith("/admin") && role !== "admin") {
    return redirectTo("/");
  }

  // Seller area
  if (path.startsWith("/seller")) {
    const isSeller = role === "seller";
    if (path === "/seller/register") {
      if (isSeller) return redirectTo("/seller");
    } else if (path === "/seller/pending") {
      if (isSeller) return redirectTo("/seller");
    } else if (!isSeller) {
      // Not yet approved -> route to the pending/apply page
      return redirectTo("/seller/pending");
    }
  }

  return getResponse();
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
