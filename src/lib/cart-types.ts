export type CartLine = {
  cartItemId?: string;
  variantId: string;
  variantName: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  stock: number;
  quantity: number;
};

export type ShopCartGroup = {
  shopId: string;
  shopName: string;
  shopSlug: string;
  lines: CartLine[];
};
