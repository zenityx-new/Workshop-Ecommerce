// Seed the single admin account via the Supabase Auth Admin API (service role).
// Run with: npm run seed:admin   (loads .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL || "admin@zenityx.com";
const password = process.env.ADMIN_PASSWORD || "Admin@Zenity2026";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find existing user (paginate the first page; fine for a fresh project).
const { data: list, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) throw listErr;

let user = list.users.find((u) => u.email === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "ผู้ดูแลระบบ" },
  });
  if (error) throw error;
  user = data.user;
  console.log("created admin auth user:", user.id);
} else {
  console.log("admin auth user already exists:", user.id);
}

// Promote the profile to admin (service role bypasses RLS; trigger allows
// role changes when there is no authenticated caller).
const { error: upsertErr } = await admin.from("profiles").upsert({
  id: user.id,
  role: "admin",
  status: "active",
  full_name: "ผู้ดูแลระบบ",
});
if (upsertErr) throw upsertErr;

console.log(`admin ready -> ${email}`);
