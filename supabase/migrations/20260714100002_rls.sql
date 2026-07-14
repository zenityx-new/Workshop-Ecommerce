-- =====================================================================
-- Phase 0 — Row Level Security
-- Rule: public data (active products/shops/categories/reviews) readable by all.
-- Private data readable/writable only by owner. Orders/prices/status change
-- ONLY through SECURITY DEFINER RPCs or the service role — never direct client writes.
-- =====================================================================

-- Base grants (RLS still gates every row; without a policy the op is denied).
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Enable RLS on every table
alter table public.profiles             enable row level security;
alter table public.seller_applications  enable row level security;
alter table public.shops                enable row level security;
alter table public.shop_warnings        enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_variants     enable row level security;
alter table public.product_images       enable row level security;
alter table public.addresses            enable row level security;
alter table public.carts                enable row level security;
alter table public.cart_items           enable row level security;
alter table public.wishlists            enable row level security;
alter table public.coupons              enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments             enable row level security;
alter table public.reviews              enable row level security;
alter table public.notifications        enable row level security;
alter table public.admin_audit_logs     enable row level security;

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- seller_applications ----------
create policy seller_app_select on public.seller_applications for select
  using (user_id = auth.uid() or public.is_admin());
create policy seller_app_insert on public.seller_applications for insert
  with check (user_id = auth.uid());
create policy seller_app_update on public.seller_applications for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------- shops ----------
create policy shops_select on public.shops for select
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy shops_insert on public.shops for insert
  with check (public.is_admin());
create policy shops_update on public.shops for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ---------- shop_warnings ----------
create policy shop_warnings_select on public.shop_warnings for select
  using (public.is_admin() or public.owns_shop(shop_id));
create policy shop_warnings_insert on public.shop_warnings for insert
  with check (public.is_admin());

-- ---------- categories ----------
create policy categories_select on public.categories for select using (true);
create policy categories_insert on public.categories for insert with check (public.is_admin());
create policy categories_update on public.categories for update
  using (public.is_admin()) with check (public.is_admin());
create policy categories_delete on public.categories for delete using (public.is_admin());

-- ---------- products ----------
create policy products_select on public.products for select
  using (
    (is_active and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'active'))
    or public.owns_shop(shop_id)
    or public.is_admin()
  );
create policy products_insert on public.products for insert
  with check (public.owns_shop(shop_id));
create policy products_update on public.products for update
  using (public.owns_shop(shop_id) or public.is_admin())
  with check (public.owns_shop(shop_id) or public.is_admin());
create policy products_delete on public.products for delete
  using (public.owns_shop(shop_id) or public.is_admin());

-- ---------- product_variants ----------
create policy variants_select on public.product_variants for select
  using (
    exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and ((p.is_active and s.status = 'active') or s.owner_id = auth.uid())
    )
    or public.is_admin()
  );
create policy variants_write on public.product_variants for all
  using (
    public.is_admin() or exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  );

-- ---------- product_images ----------
create policy images_select on public.product_images for select
  using (
    exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and ((p.is_active and s.status = 'active') or s.owner_id = auth.uid())
    )
    or public.is_admin()
  );
create policy images_write on public.product_images for all
  using (
    public.is_admin() or exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  );

-- ---------- addresses ----------
create policy addresses_all on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- carts ----------
create policy carts_all on public.carts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- cart_items ----------
create policy cart_items_all on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ---------- wishlists ----------
create policy wishlists_all on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- coupons ----------
create policy coupons_select on public.coupons for select
  using (public.owns_shop(shop_id) or public.is_admin());
create policy coupons_write on public.coupons for all
  using (public.owns_shop(shop_id) or public.is_admin())
  with check (public.owns_shop(shop_id) or public.is_admin());

-- ---------- orders (read only for clients; writes via RPC/service) ----------
create policy orders_select on public.orders for select
  using (buyer_id = auth.uid() or public.owns_shop(shop_id) or public.is_admin());

-- ---------- order_items ----------
create policy order_items_select on public.order_items for select
  using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or public.owns_shop(o.shop_id))
    )
  );

-- ---------- order_status_history ----------
create policy status_history_select on public.order_status_history for select
  using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or public.owns_shop(o.shop_id))
    )
  );

-- ---------- payments ----------
create policy payments_select on public.payments for select
  using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or public.owns_shop(o.shop_id))
    )
  );

-- ---------- reviews (public read) ----------
create policy reviews_select on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert
  with check (buyer_id = auth.uid());
create policy reviews_update on public.reviews for update
  using (buyer_id = auth.uid() or public.owns_shop(shop_id))
  with check (buyer_id = auth.uid() or public.owns_shop(shop_id));
create policy reviews_delete on public.reviews for delete
  using (buyer_id = auth.uid() or public.is_admin());

-- ---------- notifications ----------
create policy notifications_select on public.notifications for select
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- admin_audit_logs ----------
create policy audit_select on public.admin_audit_logs for select using (public.is_admin());
create policy audit_insert on public.admin_audit_logs for insert with check (public.is_admin());
