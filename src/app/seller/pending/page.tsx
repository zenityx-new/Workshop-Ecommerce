import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, XCircle, Store, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { SubmittedSuccessModal } from "./submitted-success-modal";

export const metadata = { title: "สถานะการสมัครผู้ขาย" };

export default async function SellerPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { user, profile } = await requireUser();
  if (profile.role === "seller") redirect("/seller");
  if (profile.role === "admin") redirect("/admin");

  const { submitted } = await searchParams;

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("seller_applications")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  // No application yet — invite to apply.
  if (!app) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store aria-hidden />
            </div>
            <CardTitle>เปิดร้านค้าของคุณ</CardTitle>
            <CardDescription>
              คุณยังไม่ได้สมัครเป็นผู้ขาย เริ่มต้นสมัครเพื่อขายสินค้าบนแพลตฟอร์ม
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/seller/register">สมัครเป็นผู้ขาย</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <SubmittedSuccessModal show={submitted === "1"} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>สถานะการสมัครผู้ขาย</CardTitle>
            {app.status === "pending" ? (
              <Badge variant="warning">
                <Clock aria-hidden />
                รออนุมัติ
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle aria-hidden />
                ถูกปฏิเสธ
              </Badge>
            )}
          </div>
          <CardDescription>ร้าน: {app.shop_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {app.status === "pending" && (
            <Alert variant="warning">
              <Clock aria-hidden />
              <AlertDescription>
                ใบสมัครของคุณอยู่ระหว่างการตรวจสอบ ทีมงานจะแจ้งผลให้ทราบเร็วที่สุด
                — ส่งเมื่อ {formatDateTime(app.created_at)}
              </AlertDescription>
            </Alert>
          )}

          {app.status === "rejected" && (
            <>
              <Alert variant="destructive">
                <XCircle aria-hidden />
                <AlertDescription>
                  ใบสมัครของคุณไม่ผ่านการอนุมัติ
                </AlertDescription>
              </Alert>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4" aria-hidden />
                  เหตุผลจากผู้ดูแลระบบ
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {app.reject_reason || "ไม่ได้ระบุเหตุผล"}
                </p>
              </div>
            </>
          )}
        </CardContent>
        {app.status === "rejected" && (
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/seller/register">แก้ไขและส่งใบสมัครใหม่</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
