-- =====================================================================
-- Seed data — Phase 0
-- 6 categories (เสื้อผ้า / รองเท้า require size variants)
-- Admin account is seeded separately via scripts/seed-admin.mjs
-- =====================================================================

insert into public.categories (name, slug, requires_size, sort_order) values
  ('เสื้อผ้า',              'clothing',      true,  1),
  ('รองเท้า',               'shoes',         true,  2),
  ('อุปกรณ์อิเล็กทรอนิกส์', 'electronics',   false, 3),
  ('ความงามและสุขภาพ',      'beauty-health', false, 4),
  ('บ้านและไลฟ์สไตล์',      'home-living',   false, 5),
  ('อาหารและเครื่องดื่ม',    'food-beverage', false, 6)
on conflict (slug) do nothing;
