import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;

/** Current authenticated user + profile, or nulls when signed out. */
export async function getSessionUser(): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user: { id: user.id, email: user.email }, profile };
}

/** Require a signed-in, non-banned user or redirect to login. */
export async function requireUser(redirectTo = "/login") {
  const { user, profile } = await getSessionUser();
  if (!user) redirect(redirectTo);
  if (profile?.status === "banned") redirect("/login?error=banned");
  return { user, profile: profile! };
}

/** Require a specific role or redirect home. */
export async function requireRole(
  role: Profile["role"],
  redirectTo = "/",
) {
  const { user, profile } = await requireUser();
  if (profile.role !== role) redirect(redirectTo);
  return { user, profile };
}
