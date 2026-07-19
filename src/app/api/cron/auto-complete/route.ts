import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "../_auth";

export const dynamic = "force-dynamic";

// ปิดออเดอร์ที่จัดส่งถึงแล้วเกิน 7 วันโดยอัตโนมัติ ผ่าน RPC
async function run(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("auto_complete_delivered_orders");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, completed: data ?? 0 });
}

export const GET = run;
export const POST = run;
