-- =====================================================================
-- Phase 5 — Checkout & Orders RPCs
--
-- orders/order_items/order_status_history/payments have SELECT-only RLS
-- (see rls.sql) — every state transition below is a SECURITY DEFINER
-- function so stock, pricing, and status flow are enforced in Postgres,
-- never trusted from the client (กฎเหล็ก #1-3).
-- =====================================================================

-- ---------- place_order: atomic checkout ----------
-- Splits the buyer's DB cart into one order per shop (grouped by
-- checkout_group_id), decrementing stock atomically per line
-- (UPDATE ... WHERE stock >= qty; 0 rows = out of stock -> whole
-- transaction rolls back, so two buyers racing the last unit can never
-- both succeed and stock never goes negative).
create or replace function public.place_order(
  p_address_id     uuid,
  p_payment_method public.payment_method
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

    update public.orders
    set subtotal = v_subtotal, total = v_subtotal + shipping_fee
    where id = v_order_id;

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order_id, v_status, 'สร้างคำสั่งซื้อ', v_buyer);

    insert into public.payments (order_id, method, amount, status)
    values (v_order_id, p_payment_method, v_subtotal, 'unpaid');

    insert into public.notifications (user_id, type, title, body, link)
    select s.owner_id, 'new_order', 'มีคำสั่งซื้อใหม่', 'คำสั่งซื้อ ' || v_order_no, '/seller/orders/' || v_order_id
    from public.shops s where s.id = v_shop_id;
  end loop;

  delete from public.cart_items where cart_id = v_cart_id;

  return query select v_group_id, v_order_ids;
end;
$$;

-- ---------- cancel_order ----------
-- Buyer: only from awaiting_payment/pending. Seller (shop owner): only from
-- pending/confirmed. Admin: either. Always requires a reason, always
-- restores stock (+ coupon usage, once coupons are consumed in Phase 6).
create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders%rowtype;
  v_is_buyer boolean;
  v_is_seller boolean;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'กรุณาระบุเหตุผลการยกเลิก';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ไม่พบคำสั่งซื้อ';
  end if;

  if v_order.status in ('completed', 'cancelled') then
    raise exception 'คำสั่งซื้อนี้ไม่สามารถยกเลิกได้แล้ว';
  end if;

  v_is_buyer := v_order.buyer_id = v_uid;
  v_is_seller := public.owns_shop(v_order.shop_id);

  if not (v_is_buyer or v_is_seller or public.is_admin()) then
    raise exception 'ไม่มีสิทธิ์ยกเลิกคำสั่งซื้อนี้';
  end if;

  -- Admins may cancel from any non-terminal status; buyers/sellers are
  -- restricted to the stages where cancellation is still meaningful.
  if not public.is_admin() then
    if v_is_buyer and v_order.status not in ('awaiting_payment', 'pending') then
      raise exception 'ไม่สามารถยกเลิกคำสั่งซื้อในสถานะนี้ได้';
    end if;
    if v_is_seller and not v_is_buyer and v_order.status not in ('pending', 'confirmed') then
      raise exception 'ไม่สามารถยกเลิกคำสั่งซื้อในสถานะนี้ได้';
    end if;
  end if;

  -- Restore stock for every line still pointing at a live variant.
  update public.product_variants v
  set stock = v.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.variant_id = v.id;

  if v_order.coupon_id is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = v_order.coupon_id;
  end if;

  update public.orders
  set status = 'cancelled', cancel_reason = p_reason, cancelled_by = v_uid, cancelled_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (p_order_id, 'cancelled', p_reason, v_uid);

  insert into public.notifications (user_id, type, title, body, link)
  select case when v_uid = v_order.buyer_id then s.owner_id else v_order.buyer_id end,
         'order_cancelled', 'คำสั่งซื้อถูกยกเลิก', 'คำสั่งซื้อ ' || v_order.order_no || ': ' || p_reason,
         '/account/orders/' || p_order_id
  from public.shops s where s.id = v_order.shop_id;
end;
$$;

-- ---------- update_order_status ----------
-- Seller (or admin) only. Forward transitions along the fixed flow —
-- pending -> confirmed -> shipped -> delivered. shipped requires carrier +
-- tracking number. completed/cancelled/awaiting_payment/pending are never
-- reachable through this function (see confirm_order_received / cancel_order).
create or replace function public.update_order_status(
  p_order_id    uuid,
  p_new_status  public.order_status,
  p_carrier     text default null,
  p_tracking_no text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ไม่พบคำสั่งซื้อ';
  end if;

  if not (public.owns_shop(v_order.shop_id) or public.is_admin()) then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;

  if p_new_status = 'confirmed' then
    if v_order.status <> 'pending' then
      raise exception 'ยืนยันคำสั่งซื้อได้เฉพาะสถานะรอดำเนินการเท่านั้น';
    end if;
  elsif p_new_status = 'shipped' then
    if v_order.status <> 'confirmed' then
      raise exception 'จัดส่งได้เฉพาะคำสั่งซื้อที่ยืนยันแล้วเท่านั้น';
    end if;
    if p_carrier is null or length(trim(p_carrier)) = 0
       or p_tracking_no is null or length(trim(p_tracking_no)) = 0 then
      raise exception 'กรุณาระบุขนส่งและเลขพัสดุ';
    end if;
  elsif p_new_status = 'delivered' then
    if v_order.status <> 'shipped' then
      raise exception 'ยืนยันการจัดส่งถึงได้เฉพาะคำสั่งซื้อที่กำลังจัดส่งเท่านั้น';
    end if;
  else
    raise exception 'ไม่สามารถเปลี่ยนเป็นสถานะนี้ได้ผ่านฟังก์ชันนี้';
  end if;

  update public.orders
  set status = p_new_status,
      carrier = coalesce(p_carrier, carrier),
      tracking_no = coalesce(p_tracking_no, tracking_no),
      shipped_at = case when p_new_status = 'shipped' then now() else shipped_at end,
      delivered_at = case when p_new_status = 'delivered' then now() else delivered_at end
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (
    p_order_id, p_new_status,
    case when p_new_status = 'shipped' then 'ขนส่ง ' || p_carrier || ' เลขพัสดุ ' || p_tracking_no else null end,
    auth.uid()
  );

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_order.buyer_id, 'order_status_changed', 'สถานะคำสั่งซื้อ ' || v_order.order_no || ' เปลี่ยนแปลง',
    case p_new_status
      when 'confirmed' then 'ร้านค้ายืนยันคำสั่งซื้อของคุณแล้ว'
      when 'shipped'   then 'คำสั่งซื้อของคุณถูกจัดส่งแล้ว'
      when 'delivered' then 'คำสั่งซื้อของคุณถูกจัดส่งถึงแล้ว กรุณายืนยันการรับสินค้า'
      else null
    end,
    '/account/orders/' || p_order_id
  );
end;
$$;

-- ---------- confirm_order_received ----------
-- Buyer-only: delivered -> completed.
create or replace function public.confirm_order_received(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then
    raise exception 'ไม่พบคำสั่งซื้อ';
  end if;
  if v_order.status <> 'delivered' then
    raise exception 'ยืนยันรับสินค้าได้เฉพาะคำสั่งซื้อที่จัดส่งถึงแล้วเท่านั้น';
  end if;

  update public.orders set status = 'completed', completed_at = now() where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (p_order_id, 'completed', 'ผู้ซื้อยืนยันรับสินค้า', auth.uid());

  insert into public.notifications (user_id, type, title, body, link)
  select s.owner_id, 'order_completed', 'คำสั่งซื้อสำเร็จ', 'คำสั่งซื้อ ' || v_order.order_no || ' เสร็จสมบูรณ์แล้ว',
         '/seller/orders/' || p_order_id
  from public.shops s where s.id = v_order.shop_id;
end;
$$;

-- ---------- submit_payment_slip ----------
-- Buyer-only: attaches the uploaded slip path and flips payment to
-- 'submitted' (order stays awaiting_payment until the seller verifies it).
create or replace function public.submit_payment_slip(p_order_id uuid, p_slip_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders
  where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then
    raise exception 'ไม่พบคำสั่งซื้อ';
  end if;
  if v_order.payment_method <> 'promptpay' or v_order.status <> 'awaiting_payment' then
    raise exception 'ไม่สามารถอัปโหลดสลิปสำหรับคำสั่งซื้อนี้ได้';
  end if;

  update public.payments
  set slip_url = p_slip_path, status = 'submitted', submitted_at = now(), reject_reason = null
  where order_id = p_order_id;

  insert into public.notifications (user_id, type, title, body, link)
  select s.owner_id, 'slip_submitted', 'มีสลิปรอตรวจสอบ', 'คำสั่งซื้อ ' || v_order.order_no || ' รอการตรวจสอบสลิป',
         '/seller/orders/' || p_order_id
  from public.shops s where s.id = v_order.shop_id;
end;
$$;

-- ---------- verify_payment_slip ----------
-- Seller (or admin): approve flips payments.verified + order -> pending;
-- reject requires a reason and leaves the order awaiting_payment so the
-- buyer can re-upload.
create or replace function public.verify_payment_slip(
  p_order_id uuid,
  p_approve  boolean,
  p_reason   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ไม่พบคำสั่งซื้อ';
  end if;
  if not (public.owns_shop(v_order.shop_id) or public.is_admin()) then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;

  select * into v_payment from public.payments where order_id = p_order_id for update;
  if v_payment.status <> 'submitted' then
    raise exception 'ไม่มีสลิปที่รอการตรวจสอบ';
  end if;

  if p_approve then
    update public.payments
    set status = 'verified', verified_at = now(), verified_by = auth.uid()
    where order_id = p_order_id;

    update public.orders set status = 'pending', paid_at = now() where id = p_order_id;

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (p_order_id, 'pending', 'ยืนยันการชำระเงินแล้ว', auth.uid());

    insert into public.notifications (user_id, type, title, body, link)
    values (v_order.buyer_id, 'payment_verified', 'ชำระเงินสำเร็จ',
            'คำสั่งซื้อ ' || v_order.order_no || ' ได้รับการยืนยันการชำระเงินแล้ว', '/account/orders/' || p_order_id);
  else
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'กรุณาระบุเหตุผลที่ปฏิเสธสลิป';
    end if;

    update public.payments
    set status = 'rejected', reject_reason = p_reason
    where order_id = p_order_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (v_order.buyer_id, 'payment_rejected', 'สลิปการชำระเงินถูกปฏิเสธ',
            'คำสั่งซื้อ ' || v_order.order_no || ': ' || p_reason, '/account/orders/' || p_order_id);
  end if;
end;
$$;

grant execute on function public.place_order(uuid, public.payment_method) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text, text) to authenticated;
grant execute on function public.confirm_order_received(uuid) to authenticated;
grant execute on function public.submit_payment_slip(uuid, text) to authenticated;
grant execute on function public.verify_payment_slip(uuid, boolean, text) to authenticated;
