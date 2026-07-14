-- =====================================================================
-- Phase 0 — Storage buckets & policies
--   products, shops           -> public read
--   payment-slips, seller-documents -> private (signed URL only)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('products',         'products',         true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('shops',            'shops',            true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('payment-slips',    'payment-slips',    false, 5242880,  array['image/jpeg','image/png','image/webp']),
  ('seller-documents', 'seller-documents', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Public read for the two public buckets (anon + authenticated).
create policy "public buckets are readable"
  on storage.objects for select
  using (bucket_id in ('products', 'shops'));

-- Authenticated users may upload into any project bucket.
create policy "authenticated can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('products', 'shops', 'payment-slips', 'seller-documents'));

-- Owners may update / delete their own objects.
create policy "owners can update own objects"
  on storage.objects for update
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

create policy "owners can delete own objects"
  on storage.objects for delete
  to authenticated
  using (owner = auth.uid());

-- NOTE: private buckets (payment-slips, seller-documents) have no SELECT policy,
-- so they are unreadable via the API and must be accessed through short-lived
-- signed URLs generated server-side with the service role.
