# Multi-Vendor E-Commerce (Marketplace)

ระบบร้านค้าออนไลน์แบบหลายผู้ขาย 3 role: **buyer / seller / admin**
สร้างด้วย Next.js 16 (App Router) + Supabase + Tailwind + shadcn/ui · ชำระเงินด้วย COD และ PromptPay QR (ไม่ใช้ payment gateway)

รายละเอียดสเปก/สถาปัตยกรรม/แผนพัฒนาทั้งหมดอยู่ใน [`CLAUDE.md`](./CLAUDE.md)

> **นักเรียน/ผู้ที่ clone ไปพัฒนาต่อ** — เริ่มที่ [`docs/STUDENT-GUIDE.md`](./docs/STUDENT-GUIDE.md) : คู่มือติดตั้งทีละขั้น + วิธีใช้ Claude Code พัฒนาต่อ (ภาษาไทย)

## ระบบทำอะไรได้บ้าง (ภาพรวมฟีเจอร์)

เว็บนี้คือ "ตลาดออนไลน์" ที่มีหลายร้านค้าอยู่ในที่เดียว (แบบ Shopee/Lazada) แบ่งผู้ใช้เป็น 3 ระดับ แต่ละระดับเห็นและทำสิ่งต่างกัน

### ผู้ซื้อ (Buyer)

- **เลือกดูสินค้าได้โดยไม่ต้องล็อกอิน** — เข้าเว็บมาก็เดินดูสินค้า ค้นหา กรองตามหมวด/ราคา เรียงลำดับ เปิดหน้าร้าน เปิดหน้ารายละเอียดสินค้าได้เลย (ต้องล็อกอินก็ต่อเมื่อจะกดซื้อจริง)
- **ตะกร้าสินค้า** — หยิบของใส่ตะกร้าได้ตั้งแต่ยังไม่ล็อกอิน (เก็บไว้ในเครื่อง) พอล็อกอินแล้วตะกร้าจะรวมเข้าบัญชีให้อัตโนมัติ
- **สั่งซื้อหลายร้านพร้อมกัน** — ถ้าตะกร้ามีของจากหลายร้าน ระบบจะแยกเป็นคนละคำสั่งซื้อให้ (คนละร้านคนละออเดอร์) แต่จ่ายรอบเดียว
- **ชำระเงิน 2 แบบ**: เก็บเงินปลายทาง (COD) หรือ **โอนผ่าน PromptPay** (ระบบสร้าง QR ให้ + อัปโหลดสลิปให้ร้านตรวจ)
- **ที่อยู่จัดส่ง** — บันทึกได้หลายที่อยู่ ตั้งที่อยู่หลักได้
- **คูปองส่วนลด** — กรอกโค้ดคูปองของร้านตอนสั่งซื้อ ระบบตรวจเงื่อนไข (ยอดขั้นต่ำ/วันหมดอายุ/สิทธิ์) ให้
- **ติดตามคำสั่งซื้อ** — ดูสถานะเป็นไทม์ไลน์ (รอชำระ → ยืนยัน → จัดส่ง → ถึงแล้ว → สำเร็จ) เห็นเลขพัสดุ
- **ยกเลิก / ยืนยันรับของ** — ยกเลิกได้ถ้าร้านยังไม่ยืนยัน, กดยืนยันเมื่อได้รับสินค้า
- **รีวิว + ให้ดาว** — รีวิวได้เฉพาะสินค้าที่ซื้อสำเร็จแล้ว (ร้านตอบกลับได้)
- **รายการโปรด (Wishlist)** และ **การแจ้งเตือน** ในระบบ
- **หน้า Dashboard ส่วนตัว** — สรุปจำนวนออเดอร์/ยอดใช้จ่าย + ออเดอร์ล่าสุด + แก้โปรไฟล์/รูปโปรไฟล์/ภาพปก

### ผู้ขาย (Seller)

- **สมัครเป็นผู้ขาย** — กรอกข้อมูล + อัปโหลดเอกสาร (บัตรประชาชน ฯลฯ) แล้ว **รอแอดมินอนุมัติ** ก่อนถึงจะเปิดร้านได้ (ถ้าถูกปฏิเสธจะเห็นเหตุผล)
- **ตั้งค่าร้าน** — ชื่อร้าน โลโก้ แบนเนอร์ เลขพร้อมเพย์สำหรับรับเงิน
- **จัดการสินค้า** — เพิ่ม/แก้/ลบ, ใส่รูปได้หลายรูป (สูงสุด 8 + รูปหลัก), จัดหมวดหมู่ · หมวดเสื้อผ้า/รองเท้าใส่ไซส์และสต๊อกแยกรายไซส์ได้
- **สต๊อกอัตโนมัติ** — ขายแล้วตัดสต๊อกเอง ยกเลิกแล้วคืนสต๊อก เตือนเมื่อของใกล้หมด (< 5)
- **คูปองโปรโมชั่น** — สร้างคูปองของร้านเอง (แบบ % หรือจำนวนเงิน, ตั้งยอดขั้นต่ำ, จำกัดสิทธิ์, ช่วงวันที่)
- **จัดการคำสั่งซื้อ** — ตรวจสลิป, เปลี่ยนสถานะตามขั้นตอน, กรอกบริษัทขนส่ง + เลขพัสดุ, ตอบรีวิวลูกค้า
- **Dashboard ยอดขาย** — สรุปยอดขายรายวัน/เดือน, กราฟ, สินค้าขายดี Top 10, สินค้าใกล้หมด, **ดาวน์โหลดรายงานเป็น CSV** (เปิดใน Excel ภาษาไทยได้)

### แอดมิน (Admin)

- **Dashboard ภาพรวมระบบ** — จำนวนร้าน/ผู้ซื้อ/ออเดอร์/ยอดขายรวม
- **อนุมัติ/ปฏิเสธผู้ขาย** — ดูเอกสารผู้สมัคร (เปิดดูในหน้าเดียวแบบ Modal) แล้วอนุมัติหรือปฏิเสธ (ปฏิเสธต้องกรอกเหตุผล)
- **จัดการผู้ใช้** — ค้นหา, แบน/ปลดแบน, และตั้งผู้ใช้ทั่วไปให้เป็นแอดมินได้ (ไม่มีทางสมัครแอดมินตรงๆ)
- **ควบคุมร้านค้า** — ตักเตือนร้าน (ร้านเห็นประวัติ) และ **ระงับร้าน** (ต้องกรอกเหตุผล) → สินค้าของร้านนั้นหายจากหน้าซื้อทันที ร้านเห็นแค่หน้าเหตุผล ปลดระงับได้
- **จัดการหมวดหมู่สินค้า** — เพิ่ม/แก้/ลบ + กำหนดว่าหมวดไหนต้องใส่ไซส์
- **บันทึกทุกการกระทำ** — ทุก action ของแอดมินถูกเก็บลง audit log

### งานอัตโนมัติเบื้องหลัง (Cron)

- **ยกเลิกออเดอร์ค้างชำระ** — ออเดอร์ PromptPay ที่ไม่โอนภายใน 24 ชม. จะถูกยกเลิกอัตโนมัติ + คืนสต๊อก
- **ปิดออเดอร์อัตโนมัติ** — ออเดอร์ที่จัดส่งถึงแล้วเกิน 7 วัน (ลูกค้าไม่ได้กดยืนยัน) จะถูกปิดเป็น "สำเร็จ" ให้เอง

### หลักการเบื้องหลังที่สำคัญ

- **เงินและสต๊อกคำนวณที่เซิร์ฟเวอร์เสมอ** — ตัดสต๊อกแบบ atomic (สองคนแย่งชิ้นสุดท้าย สำเร็จได้คนเดียว สต๊อกไม่มีทางติดลบ), ราคาคิดใหม่ที่ฝั่งเซิร์ฟเวอร์ ไม่เชื่อค่าจากฝั่งผู้ใช้
- **สิทธิ์การเข้าถึงล็อกแน่น** — เปิด Row Level Security ทุกตาราง (ใครเห็น/แก้ข้อมูลไหนได้บ้างบังคับที่ระดับฐานข้อมูล) · แอดมิน/ผู้ขายถูกล็อกให้ทำได้แค่งานของตัวเอง ซื้อของไม่ได้
- **ภาษาไทย + mobile-first** ทุกหน้า ราคาจัดรูปแบบเงินบาท

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Server Actions), React 19, Tailwind v4, shadcn/ui, Zod, Zustand
- **Supabase**: Postgres (เปิด RLS ทุกตาราง) + Auth + Storage + Realtime
- **PromptPay QR**: `promptpay-qr` + `qrcode`
- **Deploy**: Vercel + Vercel Cron

## เริ่มต้นพัฒนา (local)

```bash
npm install
cp .env.example .env.local     # แล้วเติมค่าจริง (ดูหัวข้อ Environment)
npm run dev                    # http://localhost:3000
```

### Environment variables

| ตัวแปร | ใช้ที่ | หมายเหตุ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | URL โปรเจกต์ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon key (อ่าน public ได้เท่านั้น) |
| `NEXT_PUBLIC_SITE_URL` | server | origin ของเว็บ ใช้สร้าง `sitemap.xml` / `robots.txt` |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypass RLS — ห้าม import เข้า client component |
| `SUPABASE_DB_URL` | scripts | connection string สำหรับ `npm run db:apply` |
| `CRON_SECRET` | server + Vercel Cron | ป้องกัน endpoint `/api/cron/*` |

## ฐานข้อมูล

migrations อยู่ใน `supabase/migrations/` — ยิงขึ้น Supabase cloud ด้วย:

```bash
npm run db:apply     # psql ตรงไป cloud (ต้องตั้ง SUPABASE_DB_URL)
npm run db:seed      # seed หมวดหมู่ + admin (ถ้ามี)
npm run gen:types    # regenerate database.types.ts (ต้องมี SUPABASE_ACCESS_TOKEN)
```

Business logic สำคัญ (ตัดสต๊อก, คำนวณราคา, เปลี่ยนสถานะออเดอร์) อยู่ใน Postgres Function (RPC) ทั้งหมด — ดูกฎเหล็กใน `CLAUDE.md` §2

## Cron jobs

มี batch job 2 ตัว เป็น RPC ที่ยิงผ่าน HTTP endpoint (ป้องกันด้วย `CRON_SECRET`):

| Endpoint | หน้าที่ | RPC |
|---|---|---|
| `POST /api/cron/auto-cancel` | ยกเลิก PromptPay ที่ค้างชำระเกิน 24 ชม. (คืนสต๊อก + คูปอง) | `auto_cancel_unpaid_orders` |
| `POST /api/cron/auto-complete` | ปิดออเดอร์ที่จัดส่งถึงแล้วเกิน 7 วัน | `auto_complete_delivered_orders` |

ทดสอบ local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/auto-cancel
# เรียกโดยไม่มี/ผิด secret -> 401
```

ตารางเวลาบน production ตั้งไว้ใน [`vercel.json`](./vercel.json) — Vercel Cron จะแนบ header `Authorization: Bearer <CRON_SECRET>` ให้อัตโนมัติเมื่อมี env `CRON_SECRET` ในโปรเจกต์

> **หมายเหตุแผน Vercel**: ค่าเริ่มต้นตั้งเป็น **รายวัน** (`0 2 * * *` / `0 3 * * *`) เพื่อให้ deploy ได้บนแผน **Hobby** (Hobby จำกัด cron วันละครั้ง)
> ถ้าใช้แผน **Pro** อยากให้ `auto-cancel` ถี่ขึ้น (เช่นรายชั่วโมง `0 * * * *` เพื่อยกเลิกออเดอร์ค้างชำระได้ไวขึ้น) แก้ที่ `vercel.json` ได้เลย
> เกณฑ์อายุจริง (24 ชม. / 7 วัน) อยู่ใน RPC ฝั่ง DB อยู่แล้ว — cron รายวันแค่ทำให้ "รอบตรวจ" ห่างขึ้น (ออเดอร์ค้างชำระอาจถูกยกเลิกช้าสุด ~48 ชม.)

## Deploy (Vercel)

**ก่อน deploy** ต้องมี Supabase project ที่รัน migrations + seed แล้ว และปิด/เปิด Confirm email ตามต้องการ (ดู [`docs/STUDENT-GUIDE.md`](./docs/STUDENT-GUIDE.md) ข้อ 3–6)

1. push โค้ดขึ้น GitHub → เข้า https://vercel.com → **Add New… → Project** → เลือก repo นี้ → **Import**
2. ที่หน้า Configure Project → **Environment Variables** ใส่ให้ครบ:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
   (`SUPABASE_SERVICE_ROLE_KEY` และ `CRON_SECRET` เป็นความลับ — สำหรับ prod ควรสุ่ม `CRON_SECRET` ใหม่)
3. ตั้ง `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริงที่ Vercel จะให้ (ไม่มี `/` ท้าย) — ครั้งแรกอาจยังไม่รู้โดเมน ให้ deploy ก่อนแล้วกลับมาแก้ค่านี้ + redeploy
4. กด **Deploy** — Vercel รัน `next build` เองและอ่าน `vercel.json` ตั้ง Cron ให้อัตโนมัติ
5. ตรวจหลัง deploy: เปิด `/`, `/sitemap.xml`, `/robots.txt`, ลองยิง `/api/cron/*` (ต้องได้ 401 ถ้าไม่มี secret) และเช็ค Cron ที่ Vercel → **Cron Jobs**

> **Confirm email:** ตั้งค่าใน Supabase project ที่ผูกกับ prod — workshop/ทดสอบ = ปิด, ใช้งานจริง = เปิด (ดูขั้นตอนในคู่มือนักเรียน)

> รูปภาพดึงจาก Supabase public storage (ตั้ง `remotePatterns` ใน `next.config.ts` แล้ว)
> ปัจจุบันปิด image optimizer ไว้ (`unoptimized: true`) — บน Vercel เปิดใช้ได้โดยลบบรรทัดนั้น

## โครงสร้างโปรเจกต์

```
src/app/
├── (storefront)/   # หน้าแรก, search, products, shops, cart, checkout, account
├── (auth)/         # login, register, seller/register
├── seller/         # dashboard, products, orders, promotions, shop-settings, reports
├── admin/          # dashboard, users, sellers, shops, categories, audit-logs
└── api/cron/       # auto-cancel, auto-complete (ป้องกันด้วย CRON_SECRET)
src/lib/            # supabase/(client|server|admin), actions/, validators/, utils/
src/stores/         # cart-store.ts (Zustand)
src/proxy.ts        # role guard + session refresh (Next 16 middleware)
supabase/migrations # schema, RLS, RPC, storage
```
