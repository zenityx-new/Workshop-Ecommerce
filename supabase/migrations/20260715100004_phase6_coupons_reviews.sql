-- =====================================================================
-- Phase 6 — Coupons & Reviews
--
-- Coupons RLS (coupons_select) only allows the shop owner/admin to SELECT
-- a coupon row, so buyers can never read a coupon directly — every coupon
-- interaction (checkout preview + actual redemption) must go through a
-- SECURITY DEFINER RPC. Reviews are one-per-order-item (unique constraint,
-- schema.sql) and only allowed once an order is 'completed'.
-- =====================================================================

-- ---------- validate_coupon: read-only preview for checkout ----------
-- Does NOT increment used_count — that only happens inside place_order at
-- the moment of redemption, to avoid a preview call silently consuming a
-- limited-use coupon that the buyer never actually checks out with.
create or replace function public.validate_coupon(
  p_shop_id  uuid,
  p_code     text,
  p_subtotal numeric
)
returns table(coupon_id uuid, discount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric(12,2);
begin
  select * into v_coupon from public.coupons
  where shop_id = p_shop_id and code = upper(trim(p_code));
  if not found then
    raise exception 'ไม่พบคูปองนี้สำหรับร้านค้านี้';
  end if;
  if not v_coupon.is_active then
    raise exception 'คูปองนี้ถูกปิดใช้งาน';
  end if;
  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    raise exception 'คูปองนี้ยังไม่เริ่มใช้งาน';
  end if;
  if v_coupon.ends_at is not null and now() > v_coupon.ends_at then
    raise exception 'คูปองนี้หมดอายุแล้ว';
  end if;
  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    raise exception 'คูปองนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว';
  end if;
  if p_subtotal < v_coupon.min_order then
    raise exception 'ยอดสั่งซื้อยังไม่ถึงขั้นต่ำสำหรับใช้คูปองนี้';
  end if;

  v_discount := case when v_coupon.type = 'percent'
    then round(p_subtotal * v_coupon.value / 100, 2)
    else v_coupon.value
  end;
  v_discount := least(v_discount, p_subtotal);

  return query select v_coupon.id, v_discount;
end;
$$;

grant execute on function public.validate_coupon(uuid, text, numeric) to authenticated;

-- ---------- place_order: extended with per-shop coupon redemption ----------
-- Adding a parameter changes the function's signature, so the old 2-arg
-- overload must be dropped first or it lingers alongside this one and
-- PostgREST/postgres would have two "place_order"s with the same name.
drop function if exists public.place_order(uuid, public.payment_method);

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
        coupon_code = v_coupon_row.code,
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

-- ---------- submit_review ----------
-- Buyer-only, one review per order_item (unique constraint on reviews),
-- only once the order has reached 'completed'.
create or replace function public.submit_review(
  p_order_item_id uuid,
  p_rating        integer,
  p_comment       text,
  p_image_urls    text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_item      public.order_items%rowtype;
  v_order     public.orders%rowtype;
  v_review_id uuid;
begin
  if v_uid is null then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'กรุณาให้คะแนน 1-5 ดาว';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id;
  if not found then
    raise exception 'ไม่พบรายการสินค้านี้';
  end if;

  select * into v_order from public.orders where id = v_item.order_id and buyer_id = v_uid;
  if not found then
    raise exception 'ไม่มีสิทธิ์รีวิวรายการนี้';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'รีวิวได้เฉพาะคำสั่งซื้อที่สำเร็จแล้วเท่านั้น';
  end if;
  if v_item.product_id is null then
    raise exception 'ไม่พบสินค้าที่จะรีวิว';
  end if;
  if exists (select 1 from public.reviews where order_item_id = p_order_item_id) then
    raise exception 'คุณได้รีวิวรายการนี้ไปแล้ว';
  end if;

  insert into public.reviews (order_item_id, product_id, shop_id, buyer_id, rating, comment, image_urls)
  values (
    p_order_item_id, v_item.product_id, v_order.shop_id, v_uid, p_rating,
    nullif(trim(coalesce(p_comment, '')), ''), coalesce(p_image_urls, '{}')
  )
  returning id into v_review_id;

  insert into public.notifications (user_id, type, title, body, link)
  select s.owner_id, 'new_review', 'มีรีวิวใหม่',
         'สินค้า "' || v_item.product_name || '" ได้รับคะแนน ' || p_rating || ' ดาว',
         '/seller/reviews'
  from public.shops s where s.id = v_order.shop_id;

  return v_review_id;
end;
$$;

grant execute on function public.submit_review(uuid, integer, text, text[]) to authenticated;

-- ---------- reply_to_review ----------
-- Seller (shop owner) or admin only.
create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.reviews%rowtype;
begin
  if p_reply is null or length(trim(p_reply)) = 0 then
    raise exception 'กรุณากรอกข้อความตอบกลับ';
  end if;

  select * into v_review from public.reviews where id = p_review_id;
  if not found then
    raise exception 'ไม่พบรีวิวนี้';
  end if;
  if not (public.owns_shop(v_review.shop_id) or public.is_admin()) then
    raise exception 'ไม่มีสิทธิ์ตอบกลับรีวิวนี้';
  end if;

  update public.reviews
  set seller_reply = trim(p_reply), seller_replied_at = now()
  where id = p_review_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_review.buyer_id, 'review_reply', 'ร้านค้าตอบกลับรีวิวของคุณ',
    'ร้านค้าตอบกลับรีวิวสินค้าที่คุณเขียนไว้แล้ว', '/products/' || v_review.product_id
  );
end;
$$;

grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- ---------- Protect privileged review columns ----------
-- Belt-and-suspenders alongside the RPCs above: even a direct table update
-- (bypassing submit_review/reply_to_review) cannot let a buyer write
-- seller_reply or a seller edit rating/comment/image_urls.
create or replace function public.protect_review_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rating is distinct from old.rating)
     or (new.comment is distinct from old.comment)
     or (new.image_urls is distinct from old.image_urls) then
    if auth.uid() is not null and new.buyer_id <> auth.uid() then
      raise exception 'ไม่มีสิทธิ์แก้ไขรีวิวนี้';
    end if;
  end if;
  if (new.seller_reply is distinct from old.seller_reply)
     or (new.seller_replied_at is distinct from old.seller_replied_at) then
    if auth.uid() is not null and not public.owns_shop(new.shop_id) and not public.is_admin() then
      raise exception 'ไม่มีสิทธิ์ตอบกลับรีวิวนี้';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_review
  before update on public.reviews
  for each row execute function public.protect_review_privileged();

-- ---------- Storage: 'reviews' bucket for review photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reviews', 'reviews', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "public buckets are readable" on storage.objects;
create policy "public buckets are readable"
  on storage.objects for select
  using (bucket_id in ('products', 'shops', 'reviews'));

drop policy if exists "authenticated can upload" on storage.objects;
create policy "authenticated can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('products', 'shops', 'payment-slips', 'seller-documents', 'reviews'));
