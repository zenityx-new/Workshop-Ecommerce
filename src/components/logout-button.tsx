"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { logout } from "@/lib/actions/auth";
import type { VariantProps } from "class-variance-authority";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

/** Logout trigger that confirms with the user before actually signing out. */
export function LogoutButton({
  variant = "ghost",
  className,
  iconOnly = false,
}: {
  variant?: ButtonVariant;
  className?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : "default"}
        aria-label="ออกจากระบบ"
        className={className}
        onClick={() => setOpen(true)}
      >
        <LogOut aria-hidden />
        {!iconOnly && "ออกจากระบบ"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ออกจากระบบ</DialogTitle>
            <DialogDescription>คุณต้องการออกจากระบบใช่หรือไม่?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <form action={logout}>
              <SubmitButton variant="destructive" pendingText="กำลังออกจากระบบ...">
                ออกจากระบบ
              </SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
