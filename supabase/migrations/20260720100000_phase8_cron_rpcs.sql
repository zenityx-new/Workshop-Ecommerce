-- Phase 8 — Cron RPCs
-- สอง batch job ที่ Cloudflare Cron จะเรียกผ่าน service role:
--   1) auto_cancel_unpaid_orders  — ยกเลิก PromptPay ที่ค้างชำระเกิน 24 ชม.
--                                    (คืนสต๊อก + คืนสิทธิ์คูปอง)
--   2) auto_complete_delivered_orders — ปิดออเดอร์ที่จัดส่งถึงแล้วเกิน 7 วัน
--
-- ทั้งคู่ไม่พึ่ง auth.uid() (cron ไม่มี session ผู้ใช้) — changed_by/cancelled_by
-- ปล่อยเป็น null ("ระบบ") ทั้ง 2 คอลัมน์เป็น nullable อยู่แล้ว
-- security definer + เพิกถอนสิทธิ์จาก public/authenticated เหลือแค่ service_role
-- เพื่อไม่ให้ client ธรรมดายิงเองได้ (client bypass ไม่ได้เพราะไม่มี grant)

-- ---------- auto_cancel_unpaid_orders ----------
create or replace function public.auto_cancel_unpaid_orders(p_max_age interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders%rowtype;
  v_count   integer := 0;
  v_reason  constant text := 'ยกเลิกอัตโนมัติ: ไม่ชำระเงินภายใน 24 ชั่วโมง';
begin
  for v_order in
    select * from public.orders
    where status = 'awaiting_payment'
      and payment_method = 'promptpay'
      and created_at < now() - p_max_age
    for update skip locked
  loop
    -- คืนสต๊อกทุกบรรทัดที่ยังชี้ variant ที่มีอยู่
    update public.product_variants v
    set stock = v.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id and oi.variant_id = v.id;

    -- คืนสิทธิ์คูปอง (ถ้ามี)
    if v_order.coupon_id is not null then
      update public.coupons set used_count = greatest(used_count - 1, 0)
      where id = v_order.coupon_id;
    end if;

    update public.orders
    set status = 'cancelled', cancel_reason = v_reason, cancelled_at = now()
    where id = v_order.id;

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order.id, 'cancelled', v_reason, null);

    insert into public.notifications (user_id, type, title, body, link)
    values (v_order.buyer_id, 'order_cancelled', 'คำสั่งซื้อถูกยกเลิกอัตโนมัติ',
            'คำสั่งซื้อ ' || v_order.order_no || ': ' || v_reason,
            '/account/orders/' || v_order.id);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------- auto_complete_delivered_orders ----------
create or replace function public.auto_complete_delivered_orders(p_max_age interval default interval '7 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  public.orders%rowtype;
  v_count  integer := 0;
  v_note   constant text := 'ปิดออเดอร์อัตโนมัติ: ครบ 7 วันหลังจัดส่งถึง';
begin
  for v_order in
    select * from public.orders
    where status = 'delivered'
      and delivered_at is not null
      and delivered_at < now() - p_max_age
    for update skip locked
  loop
    update public.orders set status = 'completed', completed_at = now()
    where id = v_order.id;

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order.id, 'completed', v_note, null);

    -- แจ้งทั้งผู้ซื้อและเจ้าของร้าน
    insert into public.notifications (user_id, type, title, body, link)
    values (v_order.buyer_id, 'order_completed', 'คำสั่งซื้อเสร็จสมบูรณ์',
            'คำสั่งซื้อ ' || v_order.order_no || ' ถูกปิดอัตโนมัติแล้ว',
            '/account/orders/' || v_order.id);

    insert into public.notifications (user_id, type, title, body, link)
    select s.owner_id, 'order_completed', 'คำสั่งซื้อเสร็จสมบูรณ์',
           'คำสั่งซื้อ ' || v_order.order_no || ' เสร็จสมบูรณ์แล้ว (อัตโนมัติ)',
           '/seller/orders/' || v_order.id
    from public.shops s where s.id = v_order.shop_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- เหลือสิทธิ์เรียกแค่ service_role (cron) เท่านั้น
revoke all on function public.auto_cancel_unpaid_orders(interval)     from public, anon, authenticated;
revoke all on function public.auto_complete_delivered_orders(interval) from public, anon, authenticated;
grant execute on function public.auto_cancel_unpaid_orders(interval)     to service_role;
grant execute on function public.auto_complete_delivered_orders(interval) to service_role;
