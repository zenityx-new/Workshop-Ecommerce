import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "ประวัติการดำเนินการของผู้ดูแล" };

const ACTION_LABEL: Record<string, string> = {
  approve_seller_application: "อนุมัติใบสมัครผู้ขาย",
  reject_seller_application: "ปฏิเสธใบสมัครผู้ขาย",
  ban_user: "ระงับผู้ใช้",
  unban_user: "ปลดระงับผู้ใช้",
  promote_to_admin: "ตั้งเป็นผู้ดูแลระบบ",
};

export default async function AuditLogsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ScrollText aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ประวัติการดำเนินการของผู้ดูแล</h1>
          <p className="text-sm text-muted-foreground">
            บันทึกทุกการอนุมัติ ปฏิเสธ และการจัดการผู้ใช้
          </p>
        </div>
      </div>

      {!logs || logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <ScrollText className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีประวัติการดำเนินการ
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{ACTION_LABEL[log.action] ?? log.action}</Badge>
                  {log.detail && Object.keys(log.detail as object).length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {JSON.stringify(log.detail)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
