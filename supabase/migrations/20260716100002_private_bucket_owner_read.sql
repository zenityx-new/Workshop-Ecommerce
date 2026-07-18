-- =====================================================================
-- Fix: private buckets (payment-slips, seller-documents) had NO select
-- policy at all, on the theory that they should only ever be read via a
-- service-role signed URL. In practice the Supabase Storage API reads the
-- row back right after an authenticated INSERT to return upload metadata,
-- so with zero SELECT policy that read-back is denied by RLS and the
-- *insert itself* is reported to the client as
--   "StorageApiError: new row violates row-level security policy"
-- even though nothing about the insert's own WITH CHECK was violated.
-- This silently broke every authenticated client-side upload into either
-- bucket (seller application documents, checkout payment slips) — the
-- caller only ever sees a generic upload-failed error.
--
-- Fix: let the uploader (owner) select their own object. Everyone else
-- still has no read access to these buckets — admin/server access
-- continues via createSignedUrl() through the service-role client, which
-- bypasses RLS entirely and is unaffected by this policy either way.
-- =====================================================================

create policy "owners can read own private objects"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('payment-slips', 'seller-documents') and owner = auth.uid());
