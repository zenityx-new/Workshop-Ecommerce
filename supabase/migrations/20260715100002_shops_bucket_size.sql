-- =====================================================================
-- Phase 3 fix — allow shop logo/banner uploads up to 10 MB (was 5 MB)
-- =====================================================================

update storage.buckets set file_size_limit = 10485760 where id = 'shops';
