"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { AlertCircle, Camera, CheckCircle2, ImagePlus } from "lucide-react";
import { updateShopSettings } from "@/lib/actions/shop";
import type { ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";

const initial: ActionState = {};

/** Banner + overlapping circular logo, each click-to-change with an instant preview. */
function ShopBrandingPicker({
  logoUrl,
  bannerUrl,
}: {
  logoUrl: string | null;
  bannerUrl: string | null;
}) {
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [bannerPreview, setBannerPreview] = useState(bannerUrl);
  const logoObjectUrlRef = useRef<string | null>(null);
  const bannerObjectUrlRef = useRef<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // These refs hold a plain string (or null), not a DOM node, so reading
    // `.current` at cleanup time (not a snapshot taken at mount) is correct —
    // we want whichever object URL was most recently created before unmount.
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (bannerObjectUrlRef.current) URL.revokeObjectURL(bannerObjectUrlRef.current);
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
      <Label>รูปโปรไฟล์ร้านค้า</Label>
      <div className="relative mb-14 mt-2 sm:mb-16">
        <div className="relative h-36 w-full overflow-hidden rounded-xl border bg-muted sm:h-44">
          {bannerPreview ? (
            <Image
              src={bannerPreview}
              alt="แบนเนอร์ร้านค้า"
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
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            aria-label="เปลี่ยนแบนเนอร์ร้านค้า"
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75"
          >
            <Camera className="size-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          aria-label="เปลี่ยนโลโก้ร้านค้า"
          className="absolute -bottom-12 left-4 size-24 overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm sm:-bottom-14 sm:size-28"
        >
          {logoPreview ? (
            <Image
              src={logoPreview}
              alt="โลโก้ร้านค้า"
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
        ref={logoInputRef}
        id="logo"
        name="logo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handlePick(e, logoObjectUrlRef, setLogoPreview, logoUrl)}
      />
      <input
        ref={bannerInputRef}
        id="banner"
        name="banner"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handlePick(e, bannerObjectUrlRef, setBannerPreview, bannerUrl)}
      />
      <p className="text-xs text-muted-foreground">
        คลิกที่รูปเพื่อเปลี่ยน — JPG, PNG หรือ WebP ไม่เกิน 10 MB
      </p>
    </div>
  );
}

export function ShopSettingsForm({
  name,
  description,
  promptpayId,
  logoUrl,
  bannerUrl,
}: {
  name: string;
  description: string;
  promptpayId: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateShopSettings, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && state.notice && (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <AlertDescription>{state.notice}</AlertDescription>
        </Alert>
      )}

      <ShopBrandingPicker logoUrl={logoUrl} bannerUrl={bannerUrl} />

      <div>
        <Label htmlFor="name">ชื่อร้านค้า</Label>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          placeholder="เช่น ร้านของสมชาย"
          className="mt-1.5"
          aria-invalid={!!state.fieldErrors?.name}
          required
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="description">คำอธิบายร้านค้า</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={description}
          placeholder="แนะนำร้านค้าของคุณสั้น ๆ ให้ผู้ซื้อรู้จัก"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="promptpay_id">เลขพร้อมเพย์รับเงิน</Label>
        <Input
          id="promptpay_id"
          name="promptpay_id"
          inputMode="numeric"
          defaultValue={promptpayId}
          placeholder="เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก"
          className="mt-1.5"
          aria-invalid={!!state.fieldErrors?.promptpay_id}
        />
        <FieldError messages={state.fieldErrors?.promptpay_id} />
      </div>

      <SubmitButton pendingText="กำลังบันทึก...">บันทึกการตั้งค่า</SubmitButton>
    </form>
  );
}
