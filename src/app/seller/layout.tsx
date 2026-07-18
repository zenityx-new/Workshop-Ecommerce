import { Ban, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SellerNav } from "@/components/seller-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

// Login is required for the whole /seller area. Fine-grained role checks
// (approved seller vs. applicant) are handled by the proxy and per page,
// so /seller/pending remains reachable by buyers who have applied.
// The seller nav only makes sense once approved, so it's hidden on the
// pending/apply screens. A suspended shop sees ONLY the reason screen —
// every /seller page is replaced by it until the shop is reactivated.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireUser();

  let suspended:
    | {
        name: string;
        reason: string | null;
        warnings: { id: string; reason: string; created_at: string }[];
      }
    | null = null;

  if (profile.role === "seller") {
    const supabase = await createClient();
    const { data: shop } = await supabase
      .from("shops")
      .select("id, name, status, suspend_reason")
      .eq("owner_id", user.id)
      .single();

    if (shop?.status === "suspended") {
      const { data: warnings } = await supabase
        .from("shop_warnings")
        .select("id, reason, created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });
      suspended = {
        name: shop.name,
        reason: shop.suspend_reason,
        warnings: warnings ?? [],
      };
    }
  }

  if (suspended) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
          <Card>
            <CardHeader>
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Ban aria-hidden />
              </div>
              <CardTitle className="mt-2">
                ร้าน &quot;{suspended.name}&quot; ถูกระงับ
              </CardTitle>
              <CardDescription>
                ร้านและสินค้าทั้งหมดถูกซ่อนจากหน้าซื้อชั่วคราว
                จนกว่าผู้ดูแลระบบจะปลดการระงับ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle aria-hidden />
                <AlertDescription>
                  <span className="font-medium">เหตุผลการระงับ:</span>{" "}
                  {suspended.reason || "ไม่ได้ระบุเหตุผล"}
                </AlertDescription>
              </Alert>

              {suspended.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">ประวัติการตักเตือน</p>
                  <ul className="space-y-1.5 border-l-2 border-muted pl-3 text-sm">
                    {suspended.warnings.map((w) => (
                      <li key={w.id}>
                        <span className="text-muted-foreground">
                          {formatDateTime(w.created_at)}
                        </span>
                        <span className="block">{w.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                หากมีข้อสงสัยเกี่ยวกับการระงับ กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      {profile.role === "seller" && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <SellerNav />
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
