import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/lib/actions/product";
import { ProductForm } from "@/components/seller/product-form";

export const metadata = { title: "แก้ไขสินค้า" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user!.id)
    .single();
  if (!shop) notFound();

  const { data: product } = await supabase
    .from("products")
    .select("id, category_id, name, description, price, is_active, shop_id")
    .eq("id", id)
    .single();
  if (!product || product.shop_id !== shop.id) notFound();

  const [{ data: categories }, { data: variants }, { data: images }] = await Promise.all([
    supabase.from("categories").select("id, name, requires_size").order("sort_order", { ascending: true }),
    supabase.from("product_variants").select("id, name, stock, price").eq("product_id", id),
    supabase
      .from("product_images")
      .select("id, url, is_primary")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  const resolvedImages = (images ?? []).map((img) => ({
    id: img.id,
    is_primary: img.is_primary,
    url: supabase.storage.from("products").getPublicUrl(img.url).data.publicUrl,
  }));

  const updateAction = updateProduct.bind(null, product.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Pencil aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขสินค้า</h1>
          <p className="text-sm text-muted-foreground">{product.name}</p>
        </div>
      </div>

      <ProductForm
        categories={categories ?? []}
        action={updateAction}
        submitLabel="บันทึกการแก้ไข"
        pendingText="กำลังบันทึก..."
        initialProduct={product}
        initialVariants={variants ?? []}
        initialImages={resolvedImages}
      />
    </div>
  );
}
