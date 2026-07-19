import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "../_auth";

export const dynamic = "force-dynamic";

// ยกเลิก PromptPay ที่ค้างชำระเกิน 24 ชม. (คืนสต๊อก + คูปอง) ผ่าน RPC
async function run(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("auto_cancel_unpaid_orders");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, cancelled: data ?? 0 });
}

export const GET = run;
export const POST = run;
