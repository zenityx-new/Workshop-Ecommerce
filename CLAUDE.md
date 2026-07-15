# CLAUDE.md — Multi-Vendor E-Commerce (Marketplace)

ระบบร้านค้าออนไลน์แบบหลายผู้ขาย มี 3 role: **buyer / seller / admin**
พัฒนาทีละ Phase ตาม Section 7 — จบแต่ละ Phase ให้หยุดรอผู้ใช้ทดสอบก่อนเสมอ

## 0. สถานะปัจจุบัน (อัปเดตล่าสุด: 2026-07-15)

| Phase | สถานะ | Commit |
|---|---|---|
| 0 — Setup & Database | ✅ เสร็จ | `01e07c5` |
| 1 — Auth & Roles | ✅ เสร็จ | `fea4d72`, `8054c80`, `4e4a551` |
| 2 — Admin: อนุมัติผู้ขาย & จัดการผู้ใช้ | ✅ เสร็จ | `e496839` |
| 3 — Seller: ร้านค้า & สินค้า | ✅ เสร็จ (ทดสอบแล้ว) | — |
| 4 — Storefront | ✅ เสร็จ | `e0169a8` |
| 5 — Checkout & Orders | ⏳ พัฒนา+ทดสอบอัตโนมัติผ่านแล้ว รอผู้ใช้ทดสอบ | — |
| 6-8 | ⬜ ยังไม่เริ่ม | — |

**สิ่งที่เบี่ยงจากสเปกเดิม (อนุมัติโดยผู้ใช้ระหว่างทางแล้ว):**
- ใช้ **Next.js 16** (ไม่ใช่ 15 ตาม Section 1) — `create-next-app@latest` ติดตั้ง 16 มาให้ และ `@opennextjs/cloudflare` รองรับ Next 16 อยู่แล้ว จึงใช้ต่อ (มากับ React 19 + Tailwind v4)
- Next.js 16 เปลี่ยนชื่อไฟล์ `middleware.ts` → **`src/proxy.ts`** (export ชื่อ `proxy` แทน `middleware`) — role guard logic อยู่ไฟล์นี้
- ใช้ **Supabase Cloud** ไม่ใช่ local (เครื่อง dev ไม่มี Docker) — migrations ยิงผ่าน `npm run db:apply` (psql ตรงไป cloud DB) แทน `supabase db reset`
- เพิ่มฟีเจอร์ **"ตั้งเป็นผู้ดูแลระบบ"** ในหน้าจัดการผู้ใช้ (Phase 2, `/admin/users`) — โปรโมท user ธรรมดาเป็น admin ได้ผ่าน UI (นอกเหนือสเปก Section 4 เดิม ผู้ใช้ขอเพิ่มเพื่อไม่ให้มีทางสมัคร admin ตรงได้เลย)
- `src/lib/supabase/database.types.ts` เขียนด้วยมือให้ตรง schema (ไม่ได้ auto-generate) เพราะเครื่องไม่มี Docker ให้ `supabase gen types --db-url` ใช้ — ต้องมี Supabase access token (`SUPABASE_ACCESS_TOKEN`) ก่อนจึงจะ auto-gen ผ่าน Management API ได้ (`npm run gen:types`)

**บัญชีทดสอบที่มีอยู่**: เคลียร์ข้อมูลทดสอบทั้งหมดแล้ว (2026-07-15) เหลือเฉพาะ admin `aekkarat@zenityx.com` บัญชีเดียว — ตาราง business ทั้งหมด (profiles/shops/products/orders/addresses/ฯลฯ) ว่างเปล่า มีแค่ `categories` (6 หมวดจาก seed) ที่ยังอยู่ · ไฟล์ใน Storage buckets (products/shops/payment-slips/seller-documents) ที่เคยอัปโหลดไว้ก่อนหน้ายังไม่ถูกลบ (ต้องขอสิทธิ์แยกหากต้องการเคลียร์ด้วย)

## 1. Tech Stack

- **Next.js 15** (App Router, TypeScript, Server Actions) + Tailwind + shadcn/ui + Zod + Zustand (ตะกร้า)
- **Supabase**: Postgres (เปิด RLS ทุกตาราง), Auth, Storage, Realtime
- **Deploy**: Cloudflare Workers ผ่าน `@opennextjs/cloudflare`
- **PromptPay QR**: ไลบรารี `promptpay-qr` + `qrcode` (ไม่ใช้ payment gateway)

## 2. กฎเหล็ก (ห้ามละเมิด)

1. Business logic สำคัญ (ตัดสต๊อก, คำนวณราคา, เปลี่ยนสถานะออเดอร์) ทำใน **Postgres Function (RPC)** เท่านั้น ห้ามทำฝั่ง client
2. ราคา/ยอดรวมคำนวณใหม่ที่ server เสมอ ห้ามเชื่อค่าจาก client
3. ตัดสต๊อกแบบ atomic: `UPDATE ... SET stock = stock - qty WHERE id = ? AND stock >= qty` — 0 row = สต๊อกไม่พอ ให้ rollback ทั้ง transaction
4. ยกเลิกออเดอร์ = คืนสต๊อก + คืนสิทธิ์คูปอง + บังคับกรอกเหตุผล
5. ทุก Server Action ตรวจ auth + role + validate ด้วย Zod ก่อนเสมอ
6. `SUPABASE_SERVICE_ROLE_KEY` ใช้ฝั่ง server เท่านั้น
7. UI ภาษาไทย, mobile-first, ราคาแสดงด้วย `Intl.NumberFormat('th-TH')`

## 3. Design Guidelines (UX/UI) — บังคับใช้ทุกหน้า

1. **เต็มพื้นที่**: Layout ใช้พื้นที่หน้าจอให้คุ้มค่า — ไม่ปล่อยขอบว่างเกินจำเป็น, หน้า dashboard/ตาราง/จัดการข้อมูลใช้ full-width, หน้าเนื้อหาใช้ container กว้างเหมาะสม (`max-w-7xl`)
2. **Responsive ทุกหน้า**: mobile-first → tablet → desktop · ตารางข้อมูลบนมือถือแปลงเป็น card · sidebar ของ seller/admin ยุบเป็น drawer/hamburger บนจอเล็ก · grid สินค้าปรับคอลัมน์ตามจอ (2/3/4/5 คอลัมน์)
3. **ใช้งานง่าย**: ปุ่ม action หลักเด่นชัดเจนหน้าละ 1 จุด · flow สั้นที่สุด (เช่น checkout ไม่เกิน 3 ขั้น) · ฟอร์มมี label + ข้อความ error ภาษาไทยชัดเจนใต้ช่อง · ยืนยันก่อนทำ action ที่ย้อนกลับไม่ได้ (dialog)
4. **ไอคอนสื่อความหมาย**: ใช้ **lucide-react** เท่านั้น เลือกไอคอนตรงความหมาย (ตะกร้า=ShoppingCart, ออเดอร์=Package, จัดส่ง=Truck, เงิน=Banknote, เตือน=AlertTriangle) · ไอคอนเดี่ยวต้องมี tooltip/aria-label
5. **ห้ามใช้อีโมจิเด็ดขาด** — ทั้งใน UI, ปุ่ม, ข้อความ, notification, empty state
6. **มืออาชีพ**: โทนสีเดียวทั้งระบบ (กำหนด primary ใน Tailwind theme + สีสถานะ: เขียว=สำเร็จ, เหลือง=รอดำเนินการ, แดง=ยกเลิก/อันตราย) · typography ลำดับชั้นชัด (heading/body/caption) · spacing สม่ำเสมอ (scale 4/8px) · ทุกสถานะออเดอร์ใช้ Badge สี+ไอคอนเดียวกันทุกหน้า
7. **ครบทุก state**: loading (skeleton), empty (ไอคอน+ข้อความ+ปุ่มชวนทำต่อ), error, 404 — ห้ามปล่อยหน้าขาว

## 4. ฟีเจอร์ตาม Role

### Buyer
- ดูสินค้า/ค้นหา/กรอง/หน้าร้านได้แบบ **guest** — ต้อง login ก่อนซื้อ
- สมัครแล้วใช้งานได้ทันที | ตะกร้า (guest เก็บ localStorage → merge เข้า DB เมื่อ login)
- ที่อยู่หลายรายการ + ตั้ง default | ชำระเงิน: **COD** และ **PromptPay QR + อัปโหลดสลิป**
- จัดการโปรไฟล์ | ติดตามออเดอร์ + timeline สถานะ + เลขพัสดุ
- ยกเลิกออเดอร์ (เฉพาะก่อนร้านยืนยัน) | กดยืนยันรับสินค้า | ใช้คูปอง | รีวิว (เฉพาะออเดอร์ completed) | wishlist | notification

### Seller
- สมัครพร้อมส่งเอกสาร (บัตรประชาชน ฯลฯ) → **ต้องรอ admin อนุมัติ** ก่อนเข้าระบบผู้ขาย (pending = หน้ารออนุมัติ, rejected = แสดงเหตุผล)
- ตั้งค่าร้าน: ชื่อร้าน (unique), โลโก้, แบนเนอร์, เลขพร้อมเพย์รับเงิน
- จัดการสินค้า: CRUD, รูปหลายรูป (สูงสุด 8 + รูปหลัก), หมวดหมู่, รายละเอียด
  - หมวด**เสื้อผ้า/รองเท้า** (`requires_size=true`) → บังคับใส่ไซส์ สต๊อกแยกต่อไซส์ (variants)
- สต๊อก: สั่งซื้อ = ตัดอัตโนมัติ, ยกเลิก = คืน, เตือนเมื่อ < 5
- โปรโมชั่น: คูปอง (%, บาท, ยอดขั้นต่ำ, จำกัดสิทธิ์, ช่วงวันที่)
- จัดการออเดอร์: ตรวจ/ยืนยันสลิป, เปลี่ยนสถานะตาม flow, กรอกขนส่ง+เลขพัสดุ
- Dashboard สรุปยอดขาย (วัน/เดือน, กราฟ, top 10, ใกล้หมดสต๊อก) + export CSV | ตอบรีวิว | แจ้งเตือน realtime เมื่อมีออเดอร์ใหม่

### Admin
- Dashboard: จำนวนร้าน/ผู้ซื้อ/ออเดอร์/ยอดขายรวม
- **อนุมัติ/ปฏิเสธผู้ขาย** (ปฏิเสธต้องกรอกเหตุผล) | จัดการผู้ใช้ (ค้นหา, ban/unban)
- **ตักเตือนร้าน** (บันทึกประวัติ, ร้านเห็นในระบบ) | **ระงับร้าน — บังคับกรอกเหตุผล** → สินค้าหายจากหน้าซื้อทันที, seller เห็นแค่หน้าเหตุผล, ปลดระงับได้
- จัดการหมวดหมู่ (CRUD + flag `requires_size`) | ทุก action ลง `admin_audit_logs`

## 5. Database (ตารางหลัก)

> เขียนเป็น migration ใน `supabase/migrations/` — รายละเอียดคอลัมน์ให้ออกแบบตามฟีเจอร์ Section 4

| กลุ่ม | ตาราง | จุดสำคัญ |
|---|---|---|
| ผู้ใช้ | `profiles` | เชื่อม auth.users, มี `role`, `status` — สร้างผ่าน trigger ตอน signup |
| ผู้ขาย | `seller_applications`, `shops`, `shop_warnings` | application: pending/approved/rejected (+เหตุผล) · shop: active/suspended (+เหตุผล) · 1 seller = 1 shop |
| สินค้า | `categories`, `products`, `product_variants`, `product_images` | สต๊อกอยู่ที่ **variants** (`CHECK stock >= 0`) · หมวดทั่วไปมี variant `default` ตัวเดียว |
| ผู้ซื้อ | `addresses`, `carts`, `cart_items`, `wishlists` | ที่อยู่หลายรายการ + is_default |
| ออเดอร์ | `orders`, `order_items`, `order_status_history`, `payments` | **1 order ต่อ 1 ร้าน** — ซื้อหลายร้านแตกหลาย order ผูกด้วย `checkout_group_id` · snapshot ที่อยู่/ชื่อ/ราคาลงออเดอร์ |
| อื่น ๆ | `coupons`, `reviews`, `notifications`, `admin_audit_logs` | review ผูก order_item (unique) · coupon นับ used_count |

**Storage buckets**: `products`, `shops` (public) · `payment-slips`, `seller-documents` (private, signed URL เท่านั้น)

**RLS สรุป**: สินค้า/ร้าน/หมวด/รีวิว = ทุกคนอ่านได้ (เฉพาะ active) · ข้อมูลส่วนตัว = เจ้าของเท่านั้น · orders = buyer เห็นของตัวเอง, seller เห็นของร้านตัวเอง, admin เห็นหมด · **ห้ามเปิด UPDATE ตรงให้ client แก้สถานะ/ราคา — ต้องผ่าน RPC**

**RPC ที่ต้องมี**: `place_order` (transaction: ตัดสต๊อก→แตกออเดอร์ตามร้าน→ล้างตะกร้า), `cancel_order` (คืนสต๊อก), `update_order_status` (validate flow), trigger `handle_new_user`, trigger คำนวณ rating

## 6. Order Flow

```
COD:        pending → confirmed → shipped → delivered → completed
PromptPay:  awaiting_payment →(สลิปผ่าน)→ pending → confirmed → shipped → delivered → completed
Cancel:     buyer ยกเลิกได้ที่ awaiting_payment/pending · seller ที่ pending/confirmed (ใส่เหตุผล)
```

- confirmed → shipped: บังคับกรอกขนส่ง + เลขพัสดุ
- delivered → completed: buyer กดยืนยัน หรือ auto หลัง 7 วัน (cron)
- PromptPay ไม่ชำระใน 24 ชม. → cron ยกเลิกอัตโนมัติ + คืนสต๊อก
- ทุกการเปลี่ยนสถานะ: บันทึก history + ส่ง notification — เปลี่ยนข้าม flow ต้องถูก reject ที่ DB function

## 7. แผนพัฒนา (ทำทีละ Phase — จบแล้วหยุดรอผู้ใช้ทดสอบ)

### Phase 0 — Setup & Database
Next.js + Supabase local + migrations ทุกตาราง + RLS + buckets + seed (หมวดหมู่ 6 หมวด, admin 1 บัญชี) + generate types
✅ `supabase db reset` ผ่าน · anon key อ่านได้เฉพาะข้อมูล public · `npm run dev` ไม่ error

### Phase 1 — Auth & Roles
สมัคร/ล็อกอิน buyer · สมัคร seller + อัปโหลดเอกสาร (pending) · middleware guard (`/account`=login, `/seller`=approved seller, `/admin`=admin) · หน้ารออนุมัติ/ถูกปฏิเสธ · หน้าโปรไฟล์
✅ buyer เข้า /seller,/admin ไม่ได้ · seller ใหม่เจอหน้ารออนุมัติ · เอกสารเปิด URL ตรงไม่ได้

### Phase 2 — Admin: อนุมัติผู้ขาย & จัดการผู้ใช้
รายการใบสมัคร + ดูเอกสาร → อนุมัติ (role→seller + สร้าง shop) / ปฏิเสธ (บังคับเหตุผล) · จัดการผู้ใช้ ban/unban · audit log · notification แจ้งผล
✅ อนุมัติแล้ว seller เข้า dashboard ได้ · ปฏิเสธไร้เหตุผลไม่ผ่าน · คนถูก ban login ไม่ได้ · ทุก action ลง audit log

### Phase 3 — Seller: ร้านค้า & สินค้า
ตั้งค่าร้าน (ชื่อ/โลโก้/แบนเนอร์/พร้อมเพย์) · Product CRUD + หลายรูป + variants ไซส์ + สต๊อก + เตือนใกล้หมด
✅ สินค้าหมวดเสื้อผ้าไม่ใส่ไซส์ → บันทึกไม่ได้ · Seller A แก้ของ Seller B ไม่ได้ (RLS)

### Phase 4 — Storefront
หน้าแรก · ค้นหา+filter+sort · หน้าสินค้า (แกลเลอรี, เลือกไซส์+สต๊อก) · หน้าร้าน · ตะกร้า guest→merge · wishlist
✅ guest ดูสินค้าได้ · guest cart merge หลัง login · สินค้า inactive/ร้าน suspended ไม่โผล่ · ไซส์หมดกดเพิ่มไม่ได้

### Phase 5 — Checkout & Orders (หัวใจของระบบ)
สมุดที่อยู่ · checkout (ที่อยู่+วิธีชำระ+คูปอง) · RPC place_order · PromptPay QR + อัปโหลด/ตรวจสลิป · หน้าออเดอร์ buyer (timeline, ยกเลิก, ยืนยันรับ) · หน้าจัดการออเดอร์ seller (เปลี่ยนสถานะ, เลขพัสดุ) · notification + realtime
✅ ซื้อ 2 ร้าน = 2 ออเดอร์กลุ่มเดียวกัน · สต๊อกตัด/คืนถูกต้อง · 2 คนแย่งชิ้นสุดท้าย → สำเร็จ 1 คน สต๊อกไม่ติดลบ · เปลี่ยนสถานะข้าม flow ถูก reject · shipped ไม่มีเลขพัสดุไม่ผ่าน

### Phase 6 — คูปอง & รีวิว
seller สร้างคูปอง · buyer ใช้ตอน checkout (validate ที่ server) · รีวิว+ดาว+รูป เฉพาะ completed รีวิวครั้งเดียว · seller ตอบรีวิว · rating เฉลี่ยอัตโนมัติ
✅ คูปองผิดร้าน/หมดอายุ/ยอดไม่ถึง → ปฏิเสธ · ยกเลิกออเดอร์คืนสิทธิ์คูปอง · รีวิวก่อน completed ไม่ได้

### Phase 7 — Dashboards & ควบคุมร้าน
seller dashboard (ยอดขาย, กราฟ, top 10, export CSV) · admin dashboard (สถิติระบบ) · ตักเตือนร้าน · ระงับ/ปลดระงับร้าน (บังคับเหตุผล) · จัดการหมวดหมู่
✅ ตัวเลขตรงกับ DB (ไม่นับ cancelled) · ระงับไร้เหตุผลไม่ผ่าน · ระงับแล้วสินค้าหายทันที + seller เห็นแค่หน้าเหตุผล

### Phase 8 — Cron & Deploy
Cloudflare Cron: auto-cancel ค้างชำระ 24 ชม., auto-complete delivered 7 วัน (ป้องกันด้วย `CRON_SECRET`) · polish UI/loading/empty/error · SEO metadata · deploy `@opennextjs/cloudflare` + Supabase production · README
✅ cron ทำงานถูก · เรียก cron ไม่มี secret ถูกปฏิเสธ · flow หลักครบบน production · service key ไม่หลุดไป client

## 8. โครงสร้างโปรเจกต์

```
src/app/
├── (storefront)/   # หน้าแรก, search, products/[id], shops/[slug], cart, checkout, account/*
├── (auth)/         # login, register, seller/register
├── seller/         # pending, dashboard, products, orders, promotions, shop-settings, reports
├── admin/          # dashboard, users, sellers/pending, shops, categories, audit-logs
└── api/cron/       # auto-cancel, auto-complete
src/lib/            # supabase/(client|server|admin), actions/, validators/, utils/promptpay.ts
src/stores/         # cart-store.ts (Zustand)
supabase/           # migrations/, seed.sql
src/proxy.ts        # role guard (Next.js 16 renamed middleware.ts → proxy.ts)
```

## 9. Deploy Notes (Cloudflare)

- Build/deploy: `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `CRON_SECRET`
- `next/image` ใช้ `unoptimized` หรือ custom loader (Workers ไม่มี optimizer)
- เลี่ยงไลบรารีที่พึ่ง Node API (fs, net) — เลือกตัวที่รองรับ Workers
