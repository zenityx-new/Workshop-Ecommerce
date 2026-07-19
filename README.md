# Multi-Vendor E-Commerce (Marketplace)

ระบบร้านค้าออนไลน์แบบหลายผู้ขาย 3 role: **buyer / seller / admin**
สร้างด้วย Next.js 16 (App Router) + Supabase + Tailwind + shadcn/ui · ชำระเงินด้วย COD และ PromptPay QR (ไม่ใช้ payment gateway)

รายละเอียดสเปก/สถาปัตยกรรม/แผนพัฒนาทั้งหมดอยู่ใน [`CLAUDE.md`](./CLAUDE.md)

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

> **หมายเหตุแผน Vercel**: schedule แบบรายชั่วโมง (`0 * * * *`) ต้องใช้แผน Pro ขึ้นไป
> บนแผน Hobby (cron รายวัน) ให้แก้ `auto-cancel` เป็นเช่น `0 */6 * * *` หรือรายวันตามที่แผนรองรับ

## Deploy (Vercel)

1. push โค้ดขึ้น Git แล้ว import โปรเจกต์ใน Vercel
2. ตั้ง environment variables ทั้งหมดข้างบนในหน้า Project → Settings → Environment Variables
   (โดยเฉพาะ `SUPABASE_SERVICE_ROLE_KEY` และ `CRON_SECRET` — ใส่ให้ครบทุก environment ที่ต้องใช้)
3. ตั้ง `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริง (ไม่มี `/` ท้าย)
4. Deploy — Vercel จะอ่าน `vercel.json` แล้วตั้ง Cron ให้อัตโนมัติ
5. ตรวจหลัง deploy: เปิด `/sitemap.xml`, `/robots.txt`, ลองยิง `/api/cron/*` (ต้องได้ 401 ถ้าไม่มี secret) และเช็ค Cron ที่หน้า Vercel → Cron Jobs

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
