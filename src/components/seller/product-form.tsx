"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ImagePlus, Plus, Trash2, X } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import type { ActionState } from "@/lib/actions/auth";

export type CategoryOption = { id: string; name: string; requires_size: boolean };
export type ExistingVariant = { id: string; name: string; stock: number; price: number | null };
export type ExistingImage = { id: string; url: string; is_primary: boolean };

const initial: ActionState = {};

export function ProductForm({
  categories,
  action,
  submitLabel,
  pendingText,
  initialProduct,
  initialVariants = [],
  initialImages = [],
}: {
  categories: CategoryOption[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingText: string;
  initialProduct?: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    is_active: boolean;
  };
  initialVariants?: ExistingVariant[];
  initialImages?: ExistingImage[];
}) {
  const [state, formAction] = useActionState(action, initial);
  const [categoryId, setCategoryId] = useState(
    initialProduct?.category_id ?? categories[0]?.id ?? "",
  );

  const sizeVariants = initialVariants.filter((v) => v.name !== "default");
  const defaultVariant = initialVariants.find((v) => v.name === "default");

  // Keys must be a pure function of props (not a module-level mutable counter)
  // so the server-rendered HTML and the client hydration pass agree — a
  // mismatched key here breaks React's event handlers on this subtree.
  const [variantRows, setVariantRows] = useState(() =>
    sizeVariants.length > 0
      ? sizeVariants.map((v) => ({
          key: v.id,
          id: v.id,
          name: v.name,
          stock: String(v.stock),
          price: v.price != null ? String(v.price) : "",
        }))
      : [{ key: "new-0", id: "", name: "", stock: "0", price: "" }],
  );
  const newRowSeq = useRef(0);

  // Unified list of image tiles — existing (from the DB) and newly picked
  // files share one array so ordering (and therefore "which one is the
  // cover") is just array order. Index 0 is always the cover photo.
  const [images, setImages] = useState<
    { key: string; url: string; file?: File; existingId?: string }[]
  >(() => initialImages.map((img) => ({ key: img.id, url: img.url, existingId: img.id })));
  const newImageSeq = useRef(0);
  const pickerInputRef = useRef<HTMLInputElement>(null);
  const formImagesInputRef = useRef<HTMLInputElement>(null);

  // The real, submittable file input mirrors the picked File objects
  // whenever `images` changes, via the DataTransfer trick — this keeps
  // native <form action={...}> submission working with our custom grid UI.
  useEffect(() => {
    const input = formImagesInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    images.forEach((img) => {
      if (img.file) dt.items.add(img.file);
    });
    input.files = dt.files;
  }, [images]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const requiresSize = selectedCategory?.requires_size ?? false;
  const remainingImageSlots = Math.max(8 - images.length, 0);

  function addImageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setImages((imgs) => {
      const remaining = 8 - imgs.length;
      if (remaining <= 0) return imgs;
      const newItems = Array.from(fileList)
        .slice(0, remaining)
        .map((file) => {
          newImageSeq.current += 1;
          return { key: `new-${newImageSeq.current}`, url: URL.createObjectURL(file), file };
        });
      return [...imgs, ...newItems];
    });
  }
  function removeImage(key: string) {
    setImages((imgs) => {
      const target = imgs.find((i) => i.key === key);
      if (target?.file) URL.revokeObjectURL(target.url);
      return imgs.filter((i) => i.key !== key);
    });
  }

  function addVariantRow() {
    newRowSeq.current += 1;
    setVariantRows((rows) => [
      ...rows,
      { key: `added-${newRowSeq.current}`, id: "", name: "", stock: "0", price: "" },
    ]);
  }
  function removeVariantRow(key: string) {
    setVariantRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }
  function updateVariantRow(key: string, field: "name" | "stock" | "price", value: string) {
    setVariantRows((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลสินค้า</CardTitle>
          <CardDescription>ชื่อ รายละเอียด ราคา และหมวดหมู่สินค้า</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">ชื่อสินค้า</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialProduct?.name}
              placeholder="เช่น เสื้อยืดคอกลม"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.name}
              required
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="category_id">หมวดหมู่</Label>
            <div className="mt-1.5">
              <Select
                id="category_id"
                name="category_id"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-invalid={!!state.fieldErrors?.category_id}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.requires_size ? " (ต้องระบุไซส์)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <FieldError messages={state.fieldErrors?.category_id} />
          </div>

          <div>
            <Label htmlFor="description">รายละเอียดสินค้า</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialProduct?.description ?? ""}
              placeholder="อธิบายรายละเอียด วัสดุ วิธีใช้งาน ฯลฯ"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="price">ราคา (บาท)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialProduct?.price}
              placeholder="0.00"
              className="mt-1.5"
              aria-invalid={!!state.fieldErrors?.price}
              required
            />
            <FieldError messages={state.fieldErrors?.price} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initialProduct?.is_active ?? true}
              className="size-4 rounded border-input"
            />
            เปิดขายสินค้านี้ทันที
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สต๊อกสินค้า</CardTitle>
          <CardDescription>
            {requiresSize
              ? "หมวดหมู่นี้ต้องระบุไซส์และสต๊อกแยกต่อไซส์"
              : "ระบุจำนวนสต๊อกสินค้า"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requiresSize ? (
            <>
              {variantRows.map((row, idx) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
                >
                  <input type="hidden" name="variant_id" value={row.id} />
                  <div className="min-w-32 flex-1">
                    <Label htmlFor={`variant_name_${row.key}`}>ไซส์ #{idx + 1}</Label>
                    <Input
                      id={`variant_name_${row.key}`}
                      name="variant_name"
                      value={row.name}
                      onChange={(e) => updateVariantRow(row.key, "name", e.target.value)}
                      placeholder="เช่น S, M, L, 42"
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div className="w-28">
                    <Label htmlFor={`variant_stock_${row.key}`}>สต๊อก</Label>
                    <Input
                      id={`variant_stock_${row.key}`}
                      name="variant_stock"
                      type="number"
                      min="0"
                      value={row.stock}
                      onChange={(e) => updateVariantRow(row.key, "stock", e.target.value)}
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor={`variant_price_${row.key}`}>ราคาต่างจากปกติ</Label>
                    <Input
                      id={`variant_price_${row.key}`}
                      name="variant_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price}
                      onChange={(e) => updateVariantRow(row.key, "price", e.target.value)}
                      placeholder="ไม่บังคับ"
                      className="mt-1.5"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="ลบไซส์นี้"
                    onClick={() => removeVariantRow(row.key)}
                    disabled={variantRows.length <= 1}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
                <Plus aria-hidden />
                เพิ่มไซส์
              </Button>
            </>
          ) : (
            <div className="max-w-40">
              <input type="hidden" name="default_variant_id" value={defaultVariant?.id ?? ""} />
              <Label htmlFor="stock">จำนวนสต๊อก</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                defaultValue={defaultVariant?.stock ?? 0}
                className="mt-1.5"
                required
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="size-5 text-primary" aria-hidden />
            รูปภาพสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>อัปโหลดได้สูงสุด 8 รูป (JPG, PNG, WebP ไม่เกิน 5 MB ต่อรูป)</span>
            <span>รูปแรกจะเป็นรูปปกหลัก (Cover)</span>
          </div>

          {/* Real submittable input — mirrors picked File objects programmatically. */}
          <input
            ref={formImagesInputRef}
            type="file"
            name="images"
            multiple
            className="hidden"
            required={images.length === 0}
            aria-hidden
            tabIndex={-1}
          />
          {/* Hidden input used only to open the native file picker dialog. */}
          <input
            ref={pickerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              addImageFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {initialImages
            .filter((img) => !images.some((cur) => cur.existingId === img.id))
            .map((img) => (
              <input key={img.id} type="hidden" name="delete_image_ids" value={img.id} />
            ))}
          <input
            type="hidden"
            name="primary_image_id"
            value={images[0] ? (images[0].existingId ?? "new") : ""}
          />

          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div
                key={img.key}
                className="group relative size-28 overflow-hidden rounded-xl border bg-muted"
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
                {idx === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    ปกหลัก
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.key)}
                  aria-label="ลบรูปนี้"
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}

            {remainingImageSlots > 0 && (
              <button
                type="button"
                onClick={() => pickerInputRef.current?.click()}
                className="flex size-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="size-6" aria-hidden />
                <span className="text-xs font-medium">เพิ่มรูปภาพ</span>
                <span className="text-[10px]">เลือกได้หลายรูป</span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button asChild variant="outline">
          <Link href="/seller/products">ยกเลิก</Link>
        </Button>
        <SubmitButton pendingText={pendingText}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
