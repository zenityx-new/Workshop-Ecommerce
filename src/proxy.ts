import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy-client";

/**
 * Role guard (Next 16 proxy, formerly middleware).
 *   /account/*  -> any signed-in user
 *   /seller/*   -> approved seller (role = seller); pending/rejected -> /seller/pending
 *   /admin/*    -> admin only
 *   admin is oversight-only, seller is shop-management-only: each is locked to
 *   its own area (/admin/* or /seller/*) plus the shared /account profile page
 *   (name/phone/avatar) — neither may shop, check out, track orders, or manage
 *   an address book as a buyer. Everything else for that role redirects home.
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
    path.startsWith("/checkout") ||
    path.startsWith("/seller") ||
    path.startsWith("/admin");

  // Builds the redirect off the same response Supabase just wrote refreshed
  // (or, for a banned user below, just-cleared) session cookies onto — a
  // bare `NextResponse.redirect(url)` starts a brand new response and would
  // silently drop those cookies, which is exactly what would turn the banned
  // sign-out below into another infinite loop instead of ending the session.
  const redirectTo = (to: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = search;
    const redirectResponse = NextResponse.redirect(url);
    getResponse()
      .cookies.getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  // Not signed in
  if (!user) {
    if (isGuarded) {
      return redirectTo("/login", `?redirect=${encodeURIComponent(path)}`);
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

  // Checked unconditionally (not just on guarded paths) and BEFORE any
  // role-based redirect below: a user can get banned mid-session (session
  // cookie still valid) after already being signed in as admin/seller. If
  // this only fired on guarded paths, hitting their own guarded home page
  // (e.g. a banned seller on "/seller") would bounce to "/login", which
  // — still holding a live session — would bounce right back to "/seller",
  // looping forever. Signing out here ends the session outright so the
  // next request has no user and just lands on the login page.
  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    return redirectTo("/login", "?error=banned");
  }

  // Keep signed-in users out of the auth screens
  if (path === "/login" || path === "/register") {
    return redirectTo(role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/");
  }

  // Admin is oversight-only: lock the whole storefront/seller/checkout experience
  // out. The shared /account profile page (name/phone/avatar) is the one
  // exception so admin still has somewhere to manage its own profile photo.
  if (role === "admin") {
    if (path !== "/account" && !path.startsWith("/admin")) {
      return redirectTo("/admin");
    }
    return getResponse();
  }

  // Approved seller is shop-management-only: locked to /seller/* plus the
  // shared /account profile page — cannot shop, check out, track orders, or
  // manage an address book as a buyer.
  if (role === "seller") {
    if (path !== "/account" && !path.startsWith("/seller")) {
      return redirectTo("/seller");
    }
    if (path === "/seller/register" || path === "/seller/pending") {
      return redirectTo("/seller");
    }
    return getResponse();
  }

  // From here role is "buyer" (possibly mid seller-application).
  if (path.startsWith("/admin")) {
    return redirectTo("/");
  }

  if (path.startsWith("/seller")) {
    // Let a buyer reach the apply form and its own pending/rejected status
    // page — redirecting either of those to "/seller/pending" would send
    // /seller/pending right back to itself and loop forever.
    if (path === "/seller/register" || path === "/seller/pending") {
      return getResponse();
    }
    // Not yet approved -> route to the pending/apply page
    return redirectTo("/seller/pending");
  }

  return getResponse();
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
