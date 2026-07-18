"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Tags, Ruler, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/category";
import type { ActionState } from "@/lib/actions/auth";

export type Category = {
  id: string;
  name: string;
  slug: string;
  requires_size: boolean;
  sort_order: number;
  productCount: number;
};

const initial: ActionState = {};

function CategoryFormDialog({
  mode,
  category,
  trigger,
}: {
  mode: "create" | "edit";
  category?: Category;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action =
    mode === "create"
      ? createCategory
      : updateCategory.bind(null, category!.id);
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "เพิ่มหมวดหมู่" : "แก้ไขหมวดหมู่"}
            </DialogTitle>
            <DialogDescription>
              หมวดที่บังคับไซส์ (เช่น เสื้อผ้า/รองเท้า) จะให้ผู้ขายกรอกสต๊อกแยกตามไซส์
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="name">ชื่อหมวดหมู่</Label>
              <Input
                id="name"
                name="name"
                defaultValue={category?.name}
                placeholder="เช่น เครื่องเขียน"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.name}
                required
              />
              <FieldError messages={state.fieldErrors?.name} />
            </div>
            <div>
              <Label htmlFor="slug">slug (สำหรับลิงก์ — เว้นว่างให้ระบบสร้างเอง)</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={category?.slug}
                placeholder="stationery"
                className="mt-1.5"
                aria-invalid={!!state.fieldErrors?.slug}
              />
              <FieldError messages={state.fieldErrors?.slug} />
            </div>
            <div>
              <Label htmlFor="sort_order">ลำดับการแสดง</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                min={0}
                defaultValue={category?.sort_order ?? 0}
                className="mt-1.5"
              />
              <FieldError messages={state.fieldErrors?.sort_order} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="requires_size"
                defaultChecked={category?.requires_size}
                className="size-4 rounded border-input"
              />
              บังคับใส่ไซส์ (สต๊อกแยกตามไซส์)
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton pendingText="กำลังบันทึก...">
                {mode === "create" ? "เพิ่มหมวดหมู่" : "บันทึก"}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryFormDialog
          mode="create"
          trigger={
            <Button type="button">
              <Plus aria-hidden />
              เพิ่มหมวดหมู่
            </Button>
          }
        />
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Tags className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">ยังไม่มีหมวดหมู่</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.requires_size && (
                      <Badge variant="outline" className="gap-1">
                        <Ruler className="size-3.5" aria-hidden />
                        บังคับไซส์
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    slug: {c.slug} · ลำดับ {c.sort_order} · {c.productCount} สินค้า
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <CategoryFormDialog
                    mode="edit"
                    category={c}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <Pencil aria-hidden />
                        แก้ไข
                      </Button>
                    }
                  />
                  <ConfirmSubmitButton
                    action={deleteCategory.bind(null, c.id)}
                    triggerLabel="ลบ"
                    triggerVariant="destructive"
                    title={`ลบหมวดหมู่ "${c.name}"`}
                    description="หากยังมีสินค้าอยู่ในหมวดนี้จะลบไม่ได้ การลบไม่สามารถย้อนกลับได้"
                    confirmLabel="ลบหมวดหมู่"
                    confirmVariant="destructive"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
