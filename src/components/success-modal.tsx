"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Centered success confirmation. By default it auto-dismisses after
 * `autoCloseMs`; pass `autoCloseMs={0}` to keep it open until the user
 * dismisses it (via the action button, the X, backdrop click, or Escape).
 * Provide `actionLabel` to render an explicit confirmation button — use this
 * for confirmations the user must not miss (e.g. "application submitted").
 */
export function SuccessModal({
  open,
  onOpenChange,
  title = "บันทึกสำเร็จ",
  description,
  autoCloseMs = 2000,
  actionLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  autoCloseMs?: number;
  actionLabel?: string;
}) {
  useEffect(() => {
    // autoCloseMs === 0 (or falsy) disables auto-dismiss entirely.
    if (!open || !autoCloseMs) return;
    const timer = setTimeout(() => onOpenChange(false), autoCloseMs);
    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-9 text-success" aria-hidden />
          </div>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {actionLabel && (
            <Button className="mt-2 w-full" onClick={() => onOpenChange(false)}>
              {actionLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
