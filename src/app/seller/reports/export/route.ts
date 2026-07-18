import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Sales CSV export for the signed-in seller's own shop. Excludes cancelled
// orders (same rule as the dashboard totals). RLS already scopes orders to the
// shop owner, so the query below can only ever return this seller's rows.

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "รอชำระเงิน",
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  shipped: "กำลังจัดส่ง",
  delivered: "จัดส่งถึงแล้ว",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "เก็บเงินปลายทาง",
  promptpay: "พร้อมเพย์",
};

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  // Quote if it contains comma, quote, or newline; double up embedded quotes.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("owner_id", user!.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "ไม่พบร้านค้า" }, { status: 404 });
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "order_no, created_at, status, payment_method, subtotal, discount, shipping_fee, total, coupon_code",
    )
    .eq("shop_id", shop.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  const header = [
    "เลขคำสั่งซื้อ",
    "วันที่",
    "สถานะ",
    "วิธีชำระเงิน",
    "ยอดสินค้า",
    "ส่วนลด",
    "ค่าจัดส่ง",
    "ยอดสุทธิ",
    "คูปอง",
  ];

  const rows = (orders ?? []).map((o) =>
    [
      o.order_no,
      new Date(o.created_at).toLocaleString("th-TH"),
      STATUS_LABEL[o.status] ?? o.status,
      PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
      o.subtotal,
      o.discount,
      o.shipping_fee,
      o.total,
      o.coupon_code ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  // Prepend a UTF-8 BOM so Excel renders Thai correctly.
  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-report-${today}.csv"`,
    },
  });
}
