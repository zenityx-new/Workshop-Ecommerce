"use client";

import { useState } from "react";
import { FileText, ExternalLink, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Inline document preview for admin review. Clicking the trigger opens a modal
 * that shows the image (or embeds a PDF) instead of navigating to a new tab.
 * `url` is a short-lived signed URL; `kind` is derived from the stored file
 * path by the caller. Images that a browser can't decode (e.g. HEIC in
 * Chrome/Firefox) fall back to an "open in new tab" link via onError.
 */
export function DocumentViewer({
  url,
  label,
  kind,
}: {
  url: string;
  label: string;
  kind: "image" | "pdf";
}) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-primary hover:underline"
      >
        <FileText className="size-4" aria-hidden />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>

          {kind === "pdf" ? (
            <iframe
              src={url}
              title={label}
              className="h-[70vh] w-full rounded-md border bg-muted"
            />
          ) : imgFailed ? (
            <div className="flex flex-col items-center gap-3 rounded-md border bg-muted/40 p-8 text-center">
              <AlertTriangle className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                เบราว์เซอร์นี้แสดงตัวอย่างไฟล์นี้ไม่ได้ (เช่น ไฟล์ HEIC)
                กรุณาเปิดในแท็บใหม่เพื่อดาวน์โหลด
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL, not a public /storage path next/image accepts
            <img
              src={url}
              alt={label}
              onError={() => setImgFailed(true)}
              className="mx-auto max-h-[70vh] w-auto rounded-md"
            />
          )}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-4" aria-hidden />
            เปิดในแท็บใหม่
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
