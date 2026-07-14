import { Users, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserRow } from "./user-row";

export const metadata = { title: "จัดการผู้ใช้" };

const RESULT_LIMIT = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requireRole("admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    query = query.or(
      `email.ilike.%${escaped}%,full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
    );
  }

  const { data: users } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-muted-foreground">
            ค้นหา ระงับ/ปลดระงับ และตั้งสิทธิ์ผู้ดูแลระบบ
          </p>
        </div>
      </div>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาด้วยอีเมล ชื่อ หรือเบอร์โทร"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          <Search aria-hidden />
          ค้นหา
        </Button>
      </form>

      {!users || users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              ไม่พบผู้ใช้ที่ตรงกับการค้นหา
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.length === RESULT_LIMIT && (
            <p className="text-xs text-muted-foreground">
              แสดง {RESULT_LIMIT} รายการล่าสุด — ปรับคำค้นหาให้แคบลงหากไม่พบผู้ใช้ที่ต้องการ
            </p>
          )}
          {users.map((u) => (
            <UserRow key={u.id} profile={u} currentUserId={user!.id} />
          ))}
        </div>
      )}
    </div>
  );
}
