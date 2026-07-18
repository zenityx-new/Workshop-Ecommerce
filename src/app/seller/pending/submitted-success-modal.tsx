"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SuccessModal } from "@/components/success-modal";

/**
 * Shows a one-time "submitted!" confirmation when landing here via
 * `?submitted=1` from applySeller's redirect. Deliberately lives on THIS
 * page rather than the register form: every Server Action response also
 * triggers Next.js to re-render the register page's Server Component, and
 * its own "already applied" redirect guard would fire on that re-render
 * before the client ever got to react to a returned success state.
 */
export function SubmittedSuccessModal({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show);
  const router = useRouter();

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) router.replace("/seller/pending");
  }

  return (
    <SuccessModal
      open={open}
      onOpenChange={handleClose}
      title="ส่งใบสมัครสำเร็จ"
      description="ใบสมัครของคุณถูกส่งให้ทีมงานตรวจสอบแล้ว จะแจ้งผลให้ทราบเร็วที่สุด"
      autoCloseMs={0}
      actionLabel="รับทราบ"
    />
  );
}
