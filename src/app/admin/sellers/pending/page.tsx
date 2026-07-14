import { UserCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { SellerApplicationRow } from "./application-row";

export const metadata = { title: "ใบสมัครผู้ขายที่รออนุมัติ" };

async function signedUrl(path: string | null) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from("seller-documents")
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export default async function PendingSellersPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: apps } = await supabase
    .from("seller_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = await Promise.all(
    (apps ?? []).map(async (app) => ({
      application: app,
      idCardUrl: await signedUrl(app.id_card_url),
      extraDocUrl: await signedUrl(app.extra_doc_url),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserCheck aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ใบสมัครผู้ขายที่รออนุมัติ</h1>
          <p className="text-sm text-muted-foreground">
            ตรวจสอบเอกสารและอนุมัติ หรือปฏิเสธพร้อมระบุเหตุผล
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <UserCheck className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              ไม่มีใบสมัครผู้ขายที่รออนุมัติในขณะนี้
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ application, idCardUrl, extraDocUrl }) => (
            <SellerApplicationRow
              key={application.id}
              application={application}
              idCardUrl={idCardUrl}
              extraDocUrl={extraDocUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
