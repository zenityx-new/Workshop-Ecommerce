"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import type { VariantProps } from "class-variance-authority";
import type { ActionState } from "@/lib/actions/auth";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

/** Trigger button that opens a confirm dialog before submitting a server action. */
export function ConfirmSubmitButton({
  action,
  triggerLabel,
  triggerIcon,
  triggerVariant = "outline",
  title,
  description,
  confirmLabel = "ยืนยัน",
  confirmVariant = "default",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  triggerVariant?: ButtonVariant;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {triggerIcon}
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <form action={formAction}>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
