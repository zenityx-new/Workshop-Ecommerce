-- =====================================================================
-- Phase 7 — Shop moderation RPCs (warn / suspend / unsuspend)
--
-- Multi-table, business-rule-bearing transitions (shop status + warning
-- history + owner notification + admin audit log) go through SECURITY
-- DEFINER functions, authorized inside the DB via is_admin() — same pattern
-- as the Phase 2 admin RPCs. Suspending a shop flips shops.status to
-- 'suspended', which the existing product/shop RLS already uses to hide the
-- shop and all its products from buyers immediately (no extra work here).
-- Category CRUD is NOT here — it goes straight through the anon client under
-- the categories_{insert,update,delete} RLS (is_admin()), like Phase 3.
-- =====================================================================

-- ---------- warn_shop: record a warning the seller can see ----------
create or replace function public.warn_shop(p_shop_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.shops%rowtype;
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'กรุณาระบุเหตุผลการตักเตือน';
  end if;

  select * into v_shop from public.shops where id = p_shop_id;
  if not found then
    raise exception 'ไม่พบร้านค้า';
  end if;

  insert into public.shop_warnings (shop_id, reason, created_by)
  values (p_shop_id, trim(p_reason), auth.uid());

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_shop.owner_id, 'shop_warning', 'ร้านของคุณได้รับการตักเตือน',
    trim(p_reason), '/seller'
  );

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (
    auth.uid(), 'warn_shop', 'shop', p_shop_id,
    jsonb_build_object('shop_name', v_shop.name, 'reason', trim(p_reason))
  );
end;
$$;

grant execute on function public.warn_shop(uuid, text) to authenticated;

-- ---------- set_shop_status: suspend (reason required) / unsuspend ----------
create or replace function public.set_shop_status(
  p_shop_id uuid,
  p_status  public.shop_status,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.shops%rowtype;
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;

  select * into v_shop from public.shops where id = p_shop_id for update;
  if not found then
    raise exception 'ไม่พบร้านค้า';
  end if;

  if p_status = 'suspended' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'กรุณาระบุเหตุผลการระงับร้าน';
    end if;
    update public.shops
    set status = 'suspended', suspend_reason = trim(p_reason)
    where id = p_shop_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_shop.owner_id, 'shop_suspended', 'ร้านของคุณถูกระงับ',
      trim(p_reason), '/seller'
    );
  else
    -- reactivate: clear the stored suspend reason
    update public.shops
    set status = 'active', suspend_reason = null
    where id = p_shop_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_shop.owner_id, 'shop_unsuspended', 'ร้านของคุณกลับมาเปิดขายได้แล้ว',
      'ผู้ดูแลระบบได้ปลดการระงับร้านของคุณแล้ว', '/seller'
    );
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    case when p_status = 'suspended' then 'suspend_shop' else 'unsuspend_shop' end,
    'shop', p_shop_id,
    jsonb_build_object('shop_name', v_shop.name, 'reason', p_reason)
  );
end;
$$;

grant execute on function public.set_shop_status(uuid, public.shop_status, text) to authenticated;
