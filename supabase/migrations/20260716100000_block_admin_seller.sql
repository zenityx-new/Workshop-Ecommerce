-- =====================================================================
-- Admin accounts must never become sellers — admin is an oversight-only
-- role. Blocked at three layers: proxy.ts route guard, applySeller
-- Server Action, and here at the DB (defense in depth, in case an
-- application row ever exists for an admin account regardless of path).
-- =====================================================================

create or replace function public.approve_seller_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app  public.seller_applications%rowtype;
  v_slug text;
  v_applicant_role public.user_role;
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

  select role into v_applicant_role from public.profiles where id = v_app.user_id;
  if v_applicant_role = 'admin' then
    raise exception 'ไม่สามารถอนุมัติบัญชีผู้ดูแลระบบให้เป็นผู้ขายได้';
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

-- promote_to_admin already exists (Phase 2) — an admin can never be *approved
-- into* seller now, but an existing seller could still be promoted to admin
-- via /admin/users, which would silently leave a stale shop behind while the
-- account holds both a shop and admin rights. Block that combination too.
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

  if exists (select 1 from public.shops where owner_id = p_user_id) then
    raise exception 'ไม่สามารถตั้งผู้ใช้ที่มีร้านค้าเป็นผู้ดูแลระบบได้ กรุณาโอนย้าย/ปิดร้านค้าก่อน';
  end if;

  update public.profiles set role = 'admin' where id = p_user_id;
  if not found then
    raise exception 'ไม่พบผู้ใช้';
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'promote_to_admin', 'profile', p_user_id, '{}'::jsonb);
end;
$$;
