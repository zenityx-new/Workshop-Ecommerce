-- =====================================================================
-- Fix: place_order left a stale coupon_code on orders that used no coupon.
--
-- In a multi-shop checkout the loop variable v_coupon_row (a %rowtype) was
-- only ever assigned inside the "coupon supplied for this shop" branch and
-- never reset between shops. So if shop A redeemed a coupon and shop B did
-- not, shop B's order was written with coupon_id = NULL / discount = 0
-- (correct) but coupon_code = shop A's code (wrong — a cosmetic leak on the
-- order display). Fix: derive coupon_code from v_coupon_id so it is NULL
-- exactly when no coupon was applied to that order. Money math was already
-- correct; only the displayed code column changes.
--
-- Signature is unchanged, so a plain CREATE OR REPLACE is safe (no overload
-- to drop). Body is identical to 20260715100004 except the one UPDATE line.
-- =====================================================================

create or replace function public.place_order(
  p_address_id     uuid,
  p_payment_method public.payment_method,
  p_coupons        jsonb default '[]'::jsonb  -- [{"shop_id": "...", "code": "..."}, ...]
)
returns table(checkout_group_id uuid, order_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer      uuid := auth.uid();
  v_address    public.addresses%rowtype;
  v_group_id   uuid := gen_random_uuid();
  v_cart_id    uuid;
  v_shop_id    uuid;
  v_order_id   uuid;
  v_order_ids  uuid[] := '{}';
  v_order_no   text;
  v_subtotal   numeric(12,2);
  v_line_total numeric(12,2);
  v_updated    int;
  v_status     public.order_status;
  v_item       record;
  v_coupon_code text;
  v_coupon_row  public.coupons%rowtype;
  v_discount    numeric(12,2);
  v_coupon_id   uuid;
begin
  if v_buyer is null then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;

  select * into v_address from public.addresses where id = p_address_id and user_id = v_buyer;
  if not found then
    raise exception 'ไม่พบที่อยู่จัดส่งนี้';
  end if;

  select id into v_cart_id from public.carts where user_id = v_buyer;
  if v_cart_id is null or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'ตะกร้าของคุณว่างเปล่า';
  end if;

  -- Lock every variant referenced by the cart up front (ordered by id to
  -- avoid deadlocks against concurrent checkouts touching overlapping stock).
  perform 1 from public.product_variants
  where id in (select ci.variant_id from public.cart_items ci where ci.cart_id = v_cart_id)
  order by id
  for update;

  v_status := case when p_payment_method = 'promptpay' then 'awaiting_payment' else 'pending' end;

  for v_shop_id in
    select distinct p.shop_id
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.cart_id = v_cart_id
  loop
    if not exists (select 1 from public.shops s where s.id = v_shop_id and s.status = 'active') then
      raise exception 'ร้านค้าถูกระงับการขาย กรุณานำสินค้าออกจากตะกร้าก่อนทำรายการ';
    end if;

    v_order_no := 'ORD' || to_char(now(), 'YYYYMMDD') || upper(substr(md5(random()::text || v_shop_id::text), 1, 6));
    v_subtotal := 0;

    insert into public.orders (
      order_no, checkout_group_id, buyer_id, shop_id, status, payment_method,
      ship_recipient, ship_phone, ship_line1, ship_sub_district, ship_district,
      ship_province, ship_postal_code
    ) values (
      v_order_no, v_group_id, v_buyer, v_shop_id, v_status, p_payment_method,
      v_address.recipient_name, v_address.phone, v_address.line1, v_address.sub_district,
      v_address.district, v_address.province, v_address.postal_code
    ) returning id into v_order_id;

    v_order_ids := array_append(v_order_ids, v_order_id);

    for v_item in
      select ci.variant_id, ci.quantity, v.name as variant_name,
             coalesce(v.price, p.price) as unit_price,
             p.id as product_id, p.name as product_name, p.is_active as product_active
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.products p on p.id = v.product_id
      where ci.cart_id = v_cart_id and p.shop_id = v_shop_id
    loop
      if not v_item.product_active then
        raise exception 'สินค้า "%" ไม่พร้อมจำหน่ายแล้ว กรุณานำออกจากตะกร้า', v_item.product_name;
      end if;

      update public.product_variants
      set stock = stock - v_item.quantity
      where id = v_item.variant_id and stock >= v_item.quantity;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'สินค้า "%" (%) มีสต๊อกไม่เพียงพอ กรุณาปรับจำนวนในตะกร้า', v_item.product_name, v_item.variant_name;
      end if;

      v_line_total := v_item.unit_price * v_item.quantity;
      v_subtotal := v_subtotal + v_line_total;

      insert into public.order_items (
        order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, line_total
      ) values (
        v_order_id, v_item.product_id, v_item.variant_id, v_item.product_name, v_item.variant_name,
        v_item.unit_price, v_item.quantity, v_line_total
      );
    end loop;

    -- ---- coupon redemption for this shop's order (coupons are shop-scoped) ----
    v_discount := 0;
    v_coupon_id := null;
    v_coupon_code := null;

    select elem->>'code' into v_coupon_code
    from jsonb_array_elements(coalesce(p_coupons, '[]'::jsonb)) elem
    where elem->>'shop_id' = v_shop_id::text
    limit 1;

    if v_coupon_code is not null and length(trim(v_coupon_code)) > 0 then
      select * into v_coupon_row from public.coupons
      where shop_id = v_shop_id and code = upper(trim(v_coupon_code));
      if not found then
        raise exception 'ไม่พบคูปอง "%" สำหรับร้านนี้', v_coupon_code;
      end if;
      if not v_coupon_row.is_active then
        raise exception 'คูปอง "%" ถูกปิดใช้งาน', v_coupon_code;
      end if;
      if v_coupon_row.starts_at is not null and now() < v_coupon_row.starts_at then
        raise exception 'คูปอง "%" ยังไม่เริ่มใช้งาน', v_coupon_code;
      end if;
      if v_coupon_row.ends_at is not null and now() > v_coupon_row.ends_at then
        raise exception 'คูปอง "%" หมดอายุแล้ว', v_coupon_code;
      end if;
      if v_subtotal < v_coupon_row.min_order then
        raise exception 'ยอดสั่งซื้อร้าน "%" ยังไม่ถึงขั้นต่ำสำหรับใช้คูปองนี้', v_coupon_row.code;
      end if;

      -- Atomic guard against a race on a limited-use coupon (same pattern as
      -- the stock decrement above): 0 rows updated = limit already hit ->
      -- roll back the whole checkout rather than silently skip the discount.
      update public.coupons
      set used_count = used_count + 1
      where id = v_coupon_row.id
        and (usage_limit is null or used_count < usage_limit);
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'คูปอง "%" ถูกใช้ครบจำนวนสิทธิ์แล้ว', v_coupon_row.code;
      end if;

      v_discount := case when v_coupon_row.type = 'percent'
        then round(v_subtotal * v_coupon_row.value / 100, 2)
        else v_coupon_row.value
      end;
      v_discount := least(v_discount, v_subtotal);
      v_coupon_id := v_coupon_row.id;
    end if;

    update public.orders
    set subtotal = v_subtotal,
        discount = v_discount,
        coupon_id = v_coupon_id,
        -- derive from v_coupon_id so an order with no coupon never inherits a
        -- previous shop's code from the still-populated v_coupon_row.
        coupon_code = case when v_coupon_id is null then null else v_coupon_row.code end,
        total = v_subtotal - v_discount + shipping_fee
    where id = v_order_id;

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order_id, v_status, 'สร้างคำสั่งซื้อ', v_buyer);

    insert into public.payments (order_id, method, amount, status)
    values (v_order_id, p_payment_method, v_subtotal - v_discount, 'unpaid');

    insert into public.notifications (user_id, type, title, body, link)
    select s.owner_id, 'new_order', 'มีคำสั่งซื้อใหม่', 'คำสั่งซื้อ ' || v_order_no, '/seller/orders/' || v_order_id
    from public.shops s where s.id = v_shop_id;
  end loop;

  delete from public.cart_items where cart_id = v_cart_id;

  return query select v_group_id, v_order_ids;
end;
$$;

grant execute on function public.place_order(uuid, public.payment_method, jsonb) to authenticated;
