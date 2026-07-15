"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin, Truck, QrCode, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AddressFormDialog } from "@/app/(storefront)/account/addresses/address-form-dialog";
import { placeOrder } from "@/lib/actions/checkout";
import { formatTHB } from "@/lib/format";
import type { ActionState } from "@/lib/actions/auth";
import type { Tables } from "@/lib/supabase/database.types";
import type { ShopCartGroup } from "@/lib/cart-types";

const initial: ActionState = {};

function formatAddressLine(address: Tables<"addresses">) {
  return `${address.line1}${address.sub_district ? ` ต.${address.sub_district}` : ""}${
    address.district ? ` อ.${address.district}` : ""
  } ${address.province} ${address.postal_code}`;
}

export function CheckoutForm({
  addresses,
  groups,
}: {
  addresses: Tables<"addresses">[];
  groups: ShopCartGroup[];
}) {
  const [state, formAction, isPending] = useActionState(placeOrder, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "promptpay">("cod");

  // Address list can go from empty -> populated (buyer adds their first address
  // right here on the checkout page) — pick up the new default once it exists.
  useEffect(() => {
    if (selectedAddressId === "" && defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const grandTotal = groups.reduce(
    (sum, g) => sum + g.lines.reduce((s, l) => s + l.price * l.quantity, 0),
    0,
  );

  function handleReviewClick() {
    if (formRef.current && !formRef.current.reportValidity()) return;
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-5 text-primary" aria-hidden />
              ที่อยู่จัดส่ง
            </CardTitle>
            <AddressFormDialog />
          </CardHeader>
          <CardContent className="space-y-3">
            {addresses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                ยังไม่มีที่อยู่จัดส่ง กรุณาเพิ่มที่อยู่ก่อนสั่งซื้อ
              </div>
            ) : (
              addresses.map((address) => (
                <div key={address.id} className="flex items-start gap-2">
                  <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input
                      type="radio"
                      name="address_id"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="mt-1 size-4"
                      required
                    />
                    <div>
                      <p className="font-medium">
                        {address.recipient_name} · {address.phone}
                      </p>
                      <p className="text-muted-foreground">{formatAddressLine(address)}</p>
                    </div>
                  </label>
                  <AddressFormDialog address={address} />
                </div>
              ))
            )}
            {state.fieldErrors?.address_id && (
              <p className="text-sm text-destructive">{state.fieldErrors.address_id[0]}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="size-5 text-primary" aria-hidden />
              วิธีชำระเงิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="payment_method"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                className="size-4"
                required
              />
              <Truck className="size-4 text-muted-foreground" aria-hidden />
              เก็บเงินปลายทาง (COD)
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="payment_method"
                value="promptpay"
                checked={paymentMethod === "promptpay"}
                onChange={() => setPaymentMethod("promptpay")}
                className="size-4"
              />
              <QrCode className="size-4 text-muted-foreground" aria-hidden />
              โอนผ่าน PromptPay (สแกน QR แล้วแนบสลิป)
            </label>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {groups.map((group) => {
            const subtotal = group.lines.reduce((s, l) => s + l.price * l.quantity, 0);
            return (
              <Card key={group.shopId}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{group.shopName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.lines.map((line) => (
                    <div key={line.variantId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {line.productName}
                        {line.variantName !== "default" ? ` (ไซส์ ${line.variantName})` : ""} ×{" "}
                        {line.quantity}
                      </span>
                      <span>{formatTHB(line.price * line.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 text-sm font-medium">
                    <span>ยอดรวมร้านนี้</span>
                    <span>{formatTHB(subtotal)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <Card className="sticky top-20">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>ยอดรวมทั้งหมด</span>
              <span className="text-primary">{formatTHB(grandTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {groups.length > 1
                ? `สั่งซื้อจาก ${groups.length} ร้านค้า จะถูกแยกเป็น ${groups.length} คำสั่งซื้อ`
                : "ค่าจัดส่งคำนวณตามร้านค้า"}
            </p>
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={addresses.length === 0 || isPending}
              onClick={handleReviewClick}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  กำลังสั่งซื้อ...
                </>
              ) : (
                "ยืนยันสั่งซื้อ"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันคำสั่งซื้อ</DialogTitle>
            <DialogDescription>กรุณาตรวจสอบรายละเอียดก่อนยืนยันการสั่งซื้อ</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">จัดส่งไปที่</p>
              {selectedAddress ? (
                <>
                  <p className="font-medium">
                    {selectedAddress.recipient_name} · {selectedAddress.phone}
                  </p>
                  <p className="text-muted-foreground">{formatAddressLine(selectedAddress)}</p>
                </>
              ) : (
                <p className="text-destructive">กรุณาเลือกที่อยู่จัดส่ง</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">วิธีชำระเงิน</p>
              <p className="font-medium">
                {paymentMethod === "promptpay" ? "โอนผ่าน PromptPay" : "เก็บเงินปลายทาง (COD)"}
              </p>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>ยอดรวมทั้งหมด</span>
              <span className="text-primary">{formatTHB(grandTotal)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleConfirm}>
              ยืนยันสั่งซื้อ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
