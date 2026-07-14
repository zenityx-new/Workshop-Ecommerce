-- =====================================================================
-- Phase 2 — Admin RPCs (seller approval, user status, admin promotion)
--
-- All state transitions across multiple tables (profiles/shops/applications/
-- notifications/audit log) go through SECURITY DEFINER functions so they are
-- atomic and authorized inside the database itself (is_admin() re-checked
-- here, not just trusted from the calling Server Action).
-- =====================================================================

create or replace function public.approve_seller_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.seller_applications%rowtype;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;

  select * into v_app from public.seller_applications where id = p_application_id for update;
  if not found then
    raise exception 'ไม่พบใบสมัคร';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'ใบสมัครนี้ถูกดำเนินการไปแล้ว';
  end if;

  v_slug := 'shop-' || substr(md5(random()::text || v_app.id::text), 1, 8);

  begin
    insert into public.shops (owner_id, name, slug)
    values (v_app.user_id, v_app.shop_name, v_slug);
  exception when unique_violation then
    raise exception 'ชื่อร้าน "%" ถูกใช้งานแล้ว กรุณาให้ผู้สมัครเปลี่ยนชื่อร้านก่อนอนุมัติ', v_app.shop_name;
  end;

  update public.seller_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = null
  where id = p_application_id;

  update public.profiles set role = 'seller' where id = v_app.user_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_app.user_id,
    'seller_application_approved',
    'ใบสมัครผู้ขายได้รับการอนุมัติ',
    'ร้าน "' || v_app.shop_name || '" ของคุณได้รับการอนุมัติแล้ว',
    '/seller'
  );

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    'approve_seller_application',
    'seller_application',
    p_application_id,
    jsonb_build_object('user_id', v_app.user_id, 'shop_name', v_app.shop_name)
  );
end;
$$;

create or replace function public.reject_seller_application(p_application_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.seller_applications%rowtype;
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'กรุณาระบุเหตุผลการปฏิเสธ';
  end if;

  select * into v_app from public.seller_applications where id = p_application_id for update;
  if not found then
    raise exception 'ไม่พบใบสมัคร';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'ใบสมัครนี้ถูกดำเนินการไปแล้ว';
  end if;

  update public.seller_applications
  set status = 'rejected', reject_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_application_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_app.user_id,
    'seller_application_rejected',
    'ใบสมัครผู้ขายไม่ผ่านการอนุมัติ',
    p_reason,
    '/seller/pending'
  );

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    'reject_seller_application',
    'seller_application',
    p_application_id,
    jsonb_build_object('user_id', v_app.user_id, 'reason', p_reason)
  );
end;
$$;

create or replace function public.set_user_status(p_user_id uuid, p_status public.user_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'ไม่สามารถระงับบัญชีของตัวเองได้';
  end if;

  update public.profiles set status = p_status where id = p_user_id;
  if not found then
    raise exception 'ไม่พบผู้ใช้';
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    case when p_status = 'banned' then 'ban_user' else 'unban_user' end,
    'profile',
    p_user_id,
    jsonb_build_object('status', p_status)
  );
end;
$$;

create or replace function public.promote_to_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์ดำเนินการ';
  end if;

  update public.profiles set role = 'admin' where id = p_user_id;
  if not found then
    raise exception 'ไม่พบผู้ใช้';
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'promote_to_admin', 'profile', p_user_id, '{}'::jsonb);
end;
$$;

grant execute on function public.approve_seller_application(uuid) to authenticated;
grant execute on function public.reject_seller_application(uuid, text) to authenticated;
grant execute on function public.set_user_status(uuid, public.user_status) to authenticated;
grant execute on function public.promote_to_admin(uuid) to authenticated;
