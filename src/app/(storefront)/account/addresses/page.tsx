import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressFormDialog } from "./address-form-dialog";
import { AddressCard } from "./address-card";

export const metadata = { title: "สมุดที่อยู่" };

export default async function AddressesPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/account" aria-label="กลับ">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">สมุดที่อยู่</h1>
          <p className="text-sm text-muted-foreground">จัดการที่อยู่จัดส่งของคุณ</p>
        </div>
      </div>

      <div className="flex justify-end">
        <AddressFormDialog />
      </div>

      {!addresses || addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <MapPin className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">ยังไม่มีที่อยู่จัดส่ง</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}
