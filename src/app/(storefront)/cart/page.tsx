import { getDbCartGroups } from "@/lib/actions/cart";
import { getSessionUser } from "@/lib/auth";
import { CartView } from "./cart-view";

export const metadata = { title: "ตะกร้าสินค้า" };

export default async function CartPage() {
  const { user } = await getSessionUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ตะกร้าสินค้า</h1>
        <CartView mode="guest" />
      </div>
    );
  }

  const groups = await getDbCartGroups(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ตะกร้าสินค้า</h1>
      <CartView mode="db" initialGroups={groups} />
    </div>
  );
}
