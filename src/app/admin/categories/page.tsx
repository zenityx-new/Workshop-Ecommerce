import { Tags } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager, type Category } from "./category-manager";

export const metadata = { title: "จัดการหมวดหมู่" };

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, requires_size, sort_order")
    .order("sort_order", { ascending: true });

  const catList = categories ?? [];
  const { data: products } = catList.length
    ? await supabase.from("products").select("category_id")
    : { data: [] as { category_id: string }[] };

  const countByCat = new Map<string, number>();
  for (const p of products ?? []) {
    countByCat.set(p.category_id, (countByCat.get(p.category_id) ?? 0) + 1);
  }

  const rows: Category[] = catList.map((c) => ({
    ...c,
    productCount: countByCat.get(c.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Tags aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">จัดการหมวดหมู่</h1>
          <p className="text-sm text-muted-foreground">
            เพิ่ม แก้ไข ลบ และตั้งค่าหมวดที่บังคับใส่ไซส์
          </p>
        </div>
      </div>

      <CategoryManager categories={rows} />
    </div>
  );
}
