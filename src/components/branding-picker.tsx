"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Camera, ImagePlus } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Banner + overlapping circular photo, each click-to-change with an instant
 * preview. Shared between shop branding (logo/banner) and personal profile
 * branding (avatar/cover) — same visual pattern, different field names.
 */
export function BrandingPicker({
  label,
  hint = "คลิกที่รูปเพื่อเปลี่ยน — JPG, PNG หรือ WebP ไม่เกิน 10 MB",
  primaryFieldName,
  primaryUrl,
  primaryAlt,
  secondaryFieldName,
  secondaryUrl,
  secondaryAlt,
}: {
  label: string;
  hint?: string;
  primaryFieldName: string;
  primaryUrl: string | null;
  primaryAlt: string;
  secondaryFieldName: string;
  secondaryUrl: string | null;
  secondaryAlt: string;
}) {
  const [primaryPreview, setPrimaryPreview] = useState(primaryUrl);
  const [secondaryPreview, setSecondaryPreview] = useState(secondaryUrl);
  const primaryObjectUrlRef = useRef<string | null>(null);
  const secondaryObjectUrlRef = useRef<string | null>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // These refs hold a plain string (or null), not a DOM node, so reading
    // `.current` at cleanup time (not a snapshot taken at mount) is correct —
    // we want whichever object URL was most recently created before unmount.
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (primaryObjectUrlRef.current) URL.revokeObjectURL(primaryObjectUrlRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (secondaryObjectUrlRef.current) URL.revokeObjectURL(secondaryObjectUrlRef.current);
    };
  }, []);

  function handlePick(
    e: ChangeEvent<HTMLInputElement>,
    objectUrlRef: { current: string | null },
    setPreview: (url: string | null) => void,
    fallback: string | null,
  ) {
    const file = e.target.files?.[0];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!file) {
      setPreview(fallback);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreview(url);
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mb-14 mt-2 sm:mb-16">
        {/* Whole banner is clickable (not just the camera badge). */}
        <button
          type="button"
          onClick={() => secondaryInputRef.current?.click()}
          aria-label={`เปลี่ยน${secondaryAlt}`}
          className="group relative block h-36 w-full overflow-hidden rounded-xl border bg-muted sm:h-44"
        >
          {secondaryPreview ? (
            <Image
              src={secondaryPreview}
              alt={secondaryAlt}
              fill
              sizes="600px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-8" aria-hidden />
            </div>
          )}
          <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors group-hover:bg-black/75">
            <Camera className="size-4" aria-hidden />
          </span>
        </button>

        <button
          type="button"
          onClick={() => primaryInputRef.current?.click()}
          aria-label={`เปลี่ยน${primaryAlt}`}
          className="absolute -bottom-12 left-4 size-24 overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm sm:-bottom-14 sm:size-28"
        >
          {primaryPreview ? (
            <Image
              src={primaryPreview}
              alt={primaryAlt}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-6" aria-hidden />
            </div>
          )}
          <span className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
            <Camera className="size-3.5" aria-hidden />
          </span>
        </button>
      </div>

      <input
        ref={primaryInputRef}
        id={primaryFieldName}
        name={primaryFieldName}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handlePick(e, primaryObjectUrlRef, setPrimaryPreview, primaryUrl)}
      />
      <input
        ref={secondaryInputRef}
        id={secondaryFieldName}
        name={secondaryFieldName}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handlePick(e, secondaryObjectUrlRef, setSecondaryPreview, secondaryUrl)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
