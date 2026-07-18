-- =====================================================================
-- Personal profile photos (avatar + cover banner) for every role.
-- `profiles.avatar_url` already existed since Phase 0 but was never wired
-- up to any upload UI; this adds the matching cover banner column and a
-- dedicated public bucket, mirroring the shops logo/banner pattern.
-- =====================================================================

alter table public.profiles
  add column if not exists banner_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "public buckets are readable" on storage.objects;
create policy "public buckets are readable"
  on storage.objects for select
  using (bucket_id in ('products', 'shops', 'reviews', 'avatars'));

drop policy if exists "authenticated can upload" on storage.objects;
create policy "authenticated can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('products', 'shops', 'payment-slips', 'seller-documents', 'reviews', 'avatars'));
