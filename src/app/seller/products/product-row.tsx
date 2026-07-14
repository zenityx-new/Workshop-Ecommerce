"use client";

import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, AlertTriangle, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteProduct, toggleProductActive } from "@/lib/actions/product";
import { formatTHB } from "@/lib/format";

export function ProductRow({
  product,
  categoryName,
  totalStock,
  hasLowStock,
  imageUrl,
}: {
  product: { id: string; name: string; price: number; is_active: boolean };
  categoryName: string;
  totalStock: number;
  hasLowStock: boolean;
  imageUrl: string | null;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              width={64}
              height={64}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <ImageOff className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{product.name}</span>
            <Badge variant={product.is_active ? "success" : "neutral"}>
              {product.is_active ? "เปิดขาย" : "ปิดการขาย"}
            </Badge>
            {hasLowStock && (
              <Badge variant="warning">
                <AlertTriangle aria-hidden />
                สต๊อกใกล้หมด
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {categoryName} · {formatTHB(product.price)} · สต๊อกรวม {totalStock} ชิ้น
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/seller/products/${product.id}/edit`}>
              <Pencil aria-hidden />
              แก้ไข
            </Link>
          </Button>
          <ConfirmSubmitButton
            action={toggleProductActive.bind(null, product.id, !product.is_active)}
            triggerLabel={product.is_active ? "ปิดการขาย" : "เปิดขาย"}
            triggerVariant="outline"
            title={product.is_active ? "ปิดการขายสินค้า" : "เปิดขายสินค้า"}
            description={
              product.is_active
                ? `ยืนยันปิดการขาย "${product.name}" — สินค้าจะหายจากหน้าร้านทันที`
                : `ยืนยันเปิดขาย "${product.name}" — สินค้าจะแสดงในหน้าร้านทันที`
            }
            confirmLabel="ยืนยัน"
          />
          <ConfirmSubmitButton
            action={deleteProduct.bind(null, product.id)}
            triggerLabel="ลบ"
            triggerIcon={<Trash2 aria-hidden />}
            triggerVariant="destructive"
            title="ลบสินค้า"
            description={`ยืนยันลบ "${product.name}" — การลบไม่สามารถย้อนกลับได้`}
            confirmVariant="destructive"
            confirmLabel="ลบสินค้า"
          />
        </div>
      </CardContent>
    </Card>
  );
}
