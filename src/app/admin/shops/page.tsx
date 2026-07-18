import { Store } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ShopRow, type AdminShop } from "./shop-row";

export const metadata = { title: "จัดการร้านค้า" };

export default async function AdminShopsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: shops } = await supabase
    .from("shops")
    .select("id, name, slug, status, suspend_reason, owner_id, created_at")
    .order("created_at", { ascending: false });

  const shopList = shops ?? [];
  const ownerIds = shopList.map((s) => s.owner_id);
  const shopIds = shopList.map((s) => s.id);

  // shops.owner_id references auth.users, not profiles, so PostgREST can't
  // embed the owner — fetch owners/products/warnings separately and stitch.
  const [{ data: owners }, { data: products }, { data: warnings }] =
    await Promise.all([
      ownerIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", ownerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
      shopIds.length
        ? supabase.from("products").select("id, shop_id").in("shop_id", shopIds)
        : Promise.resolve({ data: [] as { id: string; shop_id: string }[] }),
      shopIds.length
        ? supabase
            .from("shop_warnings")
            .select("id, shop_id, reason, created_at")
            .in("shop_id", shopIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as { id: string; shop_id: string; reason: string; created_at: string }[] }),
    ]);

  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));
  const productCountByShop = new Map<string, number>();
  for (const p of products ?? []) {
    productCountByShop.set(p.shop_id, (productCountByShop.get(p.shop_id) ?? 0) + 1);
  }
  const warningsByShop = new Map<string, AdminShop["warnings"]>();
  for (const w of warnings ?? []) {
    const list = warningsByShop.get(w.shop_id) ?? [];
    list.push({ id: w.id, reason: w.reason, created_at: w.created_at });
    warningsByShop.set(w.shop_id, list);
  }

  const rows: AdminShop[] = shopList.map((s) => {
    const owner = ownerById.get(s.owner_id);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: s.status,
      suspend_reason: s.suspend_reason,
      ownerName: owner?.full_name || "(ไม่ระบุชื่อ)",
      ownerEmail: owner?.email ?? null,
      productCount: productCountByShop.get(s.id) ?? 0,
      warnings: warningsByShop.get(s.id) ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">จัดการร้านค้า</h1>
          <p className="text-sm text-muted-foreground">
            ตักเตือน ระงับ หรือปลดระงับร้านค้าในระบบ
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Store className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">ยังไม่มีร้านค้าในระบบ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((shop) => (
            <ShopRow key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}
