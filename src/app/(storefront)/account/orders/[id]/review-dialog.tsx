"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, ImagePlus, MessageSquareText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { StarRatingInput } from "@/components/star-rating-input";
import { submitReview } from "@/lib/actions/review";
import type { ActionState } from "@/lib/actions/auth";

const initial: ActionState = {};
const MAX_IMAGES = 4;

export function ReviewDialog({
  orderId,
  orderItemId,
  productName,
}: {
  orderId: string;
  orderItemId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const action = submitReview.bind(null, orderId);
  const [state, formAction] = useActionState(action, initial);

  const [images, setImages] = useState<{ key: string; url: string; file: File }[]>([]);
  const imageSeq = useRef(0);
  const pickerRef = useRef<HTMLInputElement>(null);
  const submitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  useEffect(() => {
    const input = submitInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    images.forEach((img) => dt.items.add(img.file));
    input.files = dt.files;
  }, [images]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setImages((imgs) => {
      const remaining = MAX_IMAGES - imgs.length;
      if (remaining <= 0) return imgs;
      const added = Array.from(fileList)
        .slice(0, remaining)
        .map((file) => {
          imageSeq.current += 1;
          return { key: `img-${imageSeq.current}`, url: URL.createObjectURL(file), file };
        });
      return [...imgs, ...added];
    });
  }
  function removeImage(key: string) {
    setImages((imgs) => {
      const target = imgs.find((i) => i.key === key);
      if (target) URL.revokeObjectURL(target.url);
      return imgs.filter((i) => i.key !== key);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquareText aria-hidden />
        เขียนรีวิว
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เขียนรีวิวสินค้า</DialogTitle>
            <DialogDescription>{productName}</DialogDescription>
          </DialogHeader>
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="order_item_id" value={orderItemId} />

            <div>
              <Label>ให้คะแนนสินค้า</Label>
              <div className="mt-1.5">
                <StarRatingInput defaultValue={5} />
              </div>
            </div>

            <div>
              <Label htmlFor="comment">ความคิดเห็น</Label>
              <Textarea
                id="comment"
                name="comment"
                placeholder="แบ่งปันความคิดเห็นเกี่ยวกับสินค้านี้ (ไม่บังคับ)"
                className="mt-1.5"
              />
              <FieldError messages={state.fieldErrors?.comment} />
            </div>

            <div>
              <Label>แนบรูปภาพ (ไม่บังคับ)</Label>
              <input
                ref={submitInputRef}
                type="file"
                name="images"
                multiple
                className="hidden"
                aria-hidden
                tabIndex={-1}
              />
              <input
                ref={pickerRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="mt-1.5 flex flex-wrap gap-2">
                {images.map((img) => (
                  <div
                    key={img.key}
                    className="group relative size-20 overflow-hidden rounded-lg border bg-muted"
                  >
                    <Image src={img.url} alt="" fill sizes="80px" className="object-cover" unoptimized />
                    <button
                      type="button"
                      onClick={() => removeImage(img.key)}
                      aria-label="ลบรูปนี้"
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => pickerRef.current?.click()}
                    className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <ImagePlus className="size-5" aria-hidden />
                    <span className="text-[10px]">เพิ่มรูป</span>
                  </button>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton pendingText="กำลังบันทึก...">ส่งรีวิว</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
