-- =====================================================================
-- Phase 0 — Helper functions & triggers
-- =====================================================================

-- ---------- Auth helpers (SECURITY DEFINER to avoid RLS recursion) ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.owns_shop(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shops
    where id = p_shop_id and owner_id = auth.uid()
  );
$$;

-- ---------- Generic updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated    before update on public.profiles           for each row execute function public.set_updated_at();
create trigger trg_seller_app_updated  before update on public.seller_applications for each row execute function public.set_updated_at();
create trigger trg_shops_updated        before update on public.shops              for each row execute function public.set_updated_at();
create trigger trg_products_updated     before update on public.products           for each row execute function public.set_updated_at();
create trigger trg_variants_updated     before update on public.product_variants   for each row execute function public.set_updated_at();
create trigger trg_addresses_updated    before update on public.addresses          for each row execute function public.set_updated_at();
create trigger trg_carts_updated        before update on public.carts              for each row execute function public.set_updated_at();
create trigger trg_cart_items_updated   before update on public.cart_items         for each row execute function public.set_updated_at();
create trigger trg_coupons_updated      before update on public.coupons            for each row execute function public.set_updated_at();
create trigger trg_orders_updated       before update on public.orders             for each row execute function public.set_updated_at();
create trigger trg_payments_updated     before update on public.payments           for each row execute function public.set_updated_at();
create trigger trg_reviews_updated      before update on public.reviews            for each row execute function public.set_updated_at();

-- ---------- Create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Protect privileged columns on profiles ----------
-- role / status may only be changed by an admin or by a server/service context
-- (auth.uid() is null => running as service_role or postgres, allowed).
create or replace function public.protect_profile_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role) or (new.status is distinct from old.status) then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'ไม่มีสิทธิ์แก้ไข role หรือ status ของผู้ใช้';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();

-- ---------- Protect shop status (only admin/service may suspend/unsuspend) ----------
create or replace function public.protect_shop_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status)
     or (new.suspend_reason is distinct from old.suspend_reason)
     or (new.owner_id is distinct from old.owner_id) then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'ไม่มีสิทธิ์แก้ไขสถานะร้าน';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_shop
  before update on public.shops
  for each row execute function public.protect_shop_privileged();

-- ---------- Recompute shop rating from reviews ----------
create or replace function public.recompute_shop_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid := coalesce(new.shop_id, old.shop_id);
begin
  update public.shops s
  set rating_avg = coalesce(agg.avg_rating, 0),
      rating_count = coalesce(agg.cnt, 0)
  from (
    select avg(rating)::numeric(3,2) as avg_rating, count(*) as cnt
    from public.reviews
    where shop_id = v_shop_id
  ) agg
  where s.id = v_shop_id;
  return null;
end;
$$;

create trigger trg_reviews_recompute_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_shop_rating();
