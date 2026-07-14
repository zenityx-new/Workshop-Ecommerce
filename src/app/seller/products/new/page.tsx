import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/actions/product";
import { ProductForm } from "@/components/seller/product-form";

export const metadata = { title: "เพิ่มสินค้าใหม่" };

export default async function NewProductPage() {
  await requireRole("seller");
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, requires_size")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Plus aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มสินค้าใหม่</h1>
          <p className="text-sm text-muted-foreground">
            กรอกข้อมูลสินค้า สต๊อก และรูปภาพ
          </p>
        </div>
      </div>

      <ProductForm
        categories={categories ?? []}
        action={createProduct}
        submitLabel="บันทึกสินค้า"
        pendingText="กำลังบันทึก..."
      />
    </div>
  );
}
