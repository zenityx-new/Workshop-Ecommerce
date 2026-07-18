"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { replyToReview } from "@/lib/actions/review";
import type { ActionState } from "@/lib/actions/auth";

const initial: ActionState = {};

export function ReplyForm({
  reviewId,
  existingReply,
}: {
  reviewId: string;
  existingReply: string | null;
}) {
  const [state, formAction] = useActionState(replyToReview, initial);
  const [editing, setEditing] = useState(!existingReply);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.success]);

  if (existingReply && !editing) {
    return (
      <div className="rounded-md bg-muted/50 p-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-primary">คำตอบของร้านค้า</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            แก้ไข
          </Button>
        </div>
        <p className="text-muted-foreground">{existingReply}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="review_id" value={reviewId} />
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Textarea
        name="reply"
        defaultValue={existingReply ?? ""}
        placeholder="ตอบกลับรีวิวนี้..."
        rows={2}
      />
      <FieldError messages={state.fieldErrors?.reply} />
      <div className="flex justify-end gap-2">
        {existingReply && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            ยกเลิก
          </Button>
        )}
        <SubmitButton size="sm" pendingText="กำลังส่ง...">
          ส่งคำตอบ
        </SubmitButton>
      </div>
    </form>
  );
}
