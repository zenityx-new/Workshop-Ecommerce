import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductFilters({
  categories,
  categorySlug,
  q,
  minPrice,
  maxPrice,
  sort,
}: {
  categories: { id: string; name: string; slug: string }[];
  categorySlug: string;
  q: string;
  minPrice?: number;
  maxPrice?: number;
  sort: string;
}) {
  return (
    <div className="space-y-6">
      <form method="get" action="/products" className="space-y-3">
        <input type="hidden" name="sort" value={sort} />
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        <div>
          <Label htmlFor="q">ค้นหาสินค้า</Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="ค้นหาชื่อสินค้า"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label>ช่วงราคา (บาท)</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input name="min" type="number" min="0" defaultValue={minPrice ?? ""} placeholder="ต่ำสุด" />
            <span className="text-muted-foreground">-</span>
            <Input name="max" type="number" min="0" defaultValue={maxPrice ?? ""} placeholder="สูงสุด" />
          </div>
        </div>
        <Button type="submit" size="sm" className="w-full">
          กรองสินค้า
        </Button>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium">หมวดหมู่</p>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          <Link
            href="/products"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
              !categorySlug && "bg-primary/10 font-medium text-primary hover:bg-primary/10",
            )}
          >
            ทั้งหมด
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                categorySlug === c.slug && "bg-primary/10 font-medium text-primary hover:bg-primary/10",
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
