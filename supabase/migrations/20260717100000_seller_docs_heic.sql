-- Allow HEIC/HEIF uploads to the seller-documents bucket.
--
-- ID-card photos snapped on phones can arrive as HEIC/HEIF. iOS Safari usually
-- auto-converts them to JPEG when the file <input> doesn't list heic in its
-- `accept`, so the common path stays JPEG (viewable by admins everywhere). But
-- a HEIC can still reach us (e.g. a desktop user forcing "all files"), and the
-- server-side validator now accepts it — so the bucket must accept it too,
-- otherwise the upload fails at Storage with a confusing generic error.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf'
]
where id = 'seller-documents';
