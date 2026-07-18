import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  AlertTriangle,
  Banknote,
  CalendarDays,
  TrendingUp,
  FileBarChart,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SalesChart, type SalesPoint } from "@/components/seller/sales-chart";
import { formatTHB, formatDateTime } from "@/lib/format";

export const metadata = { title: "ร้านของฉัน" };

const LOW_STOCK_THRESHOLD = 5;
const CHART_DAYS = 14;

export default async function SellerDashboardPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, status")
    .eq("owner_id", user!.id)
    .single();

  // The suspended-shop reason screen is rendered by the seller layout, so a
  // suspended shop never reaches this page. If there's no shop yet, show the
  // welcome state below.
  if (!shop) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ร้านของฉัน</h1>
        <p className="text-muted-foreground">ยินดีต้อนรับสู่ระบบผู้ขาย</p>
      </div>
    );
  }

  // Gather this shop's product ids once (reused for low-stock + guards).
  const { data: shopProducts } = await supabase
    .from("products")
    .select("id")
    .eq("shop_id", shop.id);
  const productIds = (shopProducts ?? []).map((p) => p.id);
  const productCount = productIds.length;

  const [
    { data: orders },
    { data: items },
    { data: warnings },
    lowStockRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("created_at, total, status")
      .eq("shop_id", shop.id),
    supabase
      .from("order_items")
      .select("product_id, product_name, quantity, orders!inner(shop_id, status)")
      .eq("orders.shop_id", shop.id)
      .neq("orders.status", "cancelled"),
    supabase
      .from("shop_warnings")
      .select("id, reason, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(3),
    productIds.length
      ? supabase
          .from("product_variants")
          .select("id", { count: "exact", head: true })
          .in("product_id", productIds)
          .lt("stock", LOW_STOCK_THRESHOLD)
      : Promise.resolve({ count: 0 }),
  ]);

  const lowStockCount = lowStockRes.count ?? 0;

  // ----- revenue rollups (exclude cancelled) -----
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);

  let todayRevenue = 0;
  let monthRevenue = 0;
  let activeOrderCount = 0; // non-cancelled
  const dailyTotals = new Map<string, number>();

  for (const o of orders ?? []) {
    if (o.status === "cancelled") continue;
    activeOrderCount += 1;
    const amount = Number(o.total ?? 0);
    const dayKey = new Date(o.created_at).toISOString().slice(0, 10);
    if (dayKey === todayKey) todayRevenue += amount;
    if (dayKey.startsWith(monthKey)) monthRevenue += amount;
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + amount);
  }

  // Count orders that still need seller action.
  const pendingAction = (orders ?? []).filter((o) =>
    ["pending", "confirmed", "awaiting_payment"].includes(o.status),
  ).length;

  // ----- chart: last CHART_DAYS days -----
  const chartData: SalesPoint[] = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    chartData.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: dailyTotals.get(key) ?? 0,
    });
  }

  // ----- top 10 products by quantity sold -----
  const soldByProduct = new Map<string, { name: string; qty: number }>();
  for (const it of items ?? []) {
    const key = it.product_id ?? it.product_name;
    const prev = soldByProduct.get(key) ?? { name: it.product_name, qty: 0 };
    prev.qty += it.quantity;
    soldByProduct.set(key, prev);
  }
  const topProducts = [...soldByProduct.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const summary = [
    {
      icon: Banknote,
      label: "ยอดขายวันนี้",
      value: formatTHB(todayRevenue),
    },
    {
      icon: CalendarDays,
      label: "ยอดขายเดือนนี้",
      value: formatTHB(monthRevenue),
    },
    {
      icon: ShoppingBag,
      label: "คำสั่งซื้อ (ไม่รวมยกเลิก)",
      value: activeOrderCount,
    },
    {
      icon: AlertTriangle,
      label: "รอดำเนินการ",
      value: pendingAction,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ร้านของฉัน</h1>
            <p className="text-sm text-muted-foreground">{shop.name}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/seller/reports">
            <FileBarChart aria-hidden />
            รายงานยอดขาย
          </Link>
        </Button>
      </div>

      {(warnings ?? []).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertDescription>
            <span className="font-medium">
              ร้านของคุณได้รับการตักเตือน {warnings!.length} ครั้งล่าสุด:
            </span>
            <ul className="mt-1 space-y-1">
              {warnings!.map((w) => (
                <li key={w.id} className="text-sm">
                  {formatDateTime(w.created_at)} — {w.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <s.icon className="size-4 text-primary" aria-hidden />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-5 text-primary" aria-hidden />
              ยอดขาย {CHART_DAYS} วันล่าสุด
            </CardTitle>
            <CardDescription>ไม่รวมคำสั่งซื้อที่ยกเลิก</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-5 text-primary" aria-hidden />
              สินค้าขายดี 10 อันดับ
            </CardTitle>
            <CardDescription>ตามจำนวนที่ขายได้</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ยังไม่มีสินค้าที่ขายได้
              </p>
            ) : (
              <ol className="space-y-2">
                {topProducts.map((p, i) => (
                  <li
                    key={p.name + i}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 font-medium">{p.qty} ชิ้น</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-5 text-primary" aria-hidden />
              สินค้าทั้งหมด
            </CardTitle>
            <CardDescription>{productCount} รายการ</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/products">จัดการสินค้า</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-5 text-warning-foreground" aria-hidden />
              สต๊อกใกล้หมด
            </CardTitle>
            <CardDescription>
              {lowStockCount} ไซส์ (ต่ำกว่า {LOW_STOCK_THRESHOLD} ชิ้น)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/products">ดูรายการสินค้า</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-5 text-primary" aria-hidden />
              คำสั่งซื้อ
            </CardTitle>
            <CardDescription>จัดการออเดอร์ของร้าน</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/orders">จัดการคำสั่งซื้อ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
