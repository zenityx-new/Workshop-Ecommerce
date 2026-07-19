# คู่มือนักเรียน — Clone แล้วพัฒนาต่อ

คู่มือนี้พาคุณตั้งแต่ clone โปรเจกต์จาก GitHub → รันขึ้นในเครื่องตัวเอง → พัฒนาต่อด้วย Claude Code

> **สำคัญที่สุด:** คุณต้องสร้าง **Supabase project ของตัวเอง** (ฟรี) — ห้ามใช้ของคนอื่น เพราะฐานข้อมูล/คีย์ลับเป็นของแต่ละคน โปรเจกต์นี้จะไม่มีไฟล์ `.env.local` มาให้ (ถูกกันไว้ไม่ให้ขึ้น Git) คุณต้องสร้างเอง

---

## 1. สิ่งที่ต้องมีก่อน

| เครื่องมือ | ใช้ทำอะไร | ติดตั้ง |
|---|---|---|
| **Node.js 20 ขึ้นไป** | รันโปรเจกต์ Next.js | https://nodejs.org (เลือก LTS) |
| **Git** | clone โค้ด | https://git-scm.com |
| **บัญชี Supabase** | ฐานข้อมูล + auth + storage (ฟรี) | https://supabase.com |
| **Claude Code** | ผู้ช่วยเขียนโค้ด (พัฒนาต่อ) | https://claude.com/claude-code |
| โปรแกรมแก้โค้ด | เช่น VS Code | https://code.visualstudio.com |

ตรวจว่าติดตั้งแล้ว:
```bash
node -v    # ควรได้ v20 ขึ้นไป
git --version
```

---

## 2. Clone โปรเจกต์ + ติดตั้ง dependencies

```bash
git clone https://github.com/zenityx-new/Workshop-Ecommerce.git
cd Workshop-Ecommerce
npm install
```

---

## 3. สร้าง Supabase project ของตัวเอง

1. เข้า https://supabase.com → **New project** (ตั้งชื่ออะไรก็ได้ เลือก region ใกล้ๆ เช่น Singapore, ตั้ง Database Password จำไว้ให้ดี)
2. รอสัก 1–2 นาทีให้ project สร้างเสร็จ
3. เก็บค่าเหล่านี้ไว้ (อยู่ในเมนู **Project Settings**):

| ค่าที่ต้องหา | อยู่ที่ |
|---|---|
| `Project URL` | Settings → **API** → Project URL |
| `anon public key` | Settings → **API** → Project API keys → `anon` `public` |
| `service_role key` | Settings → **API** → Project API keys → `service_role` (**ความลับ! ห้ามเปิดเผย**) |
| `Connection string` | Settings → **Database** → Connection string → **URI** (แทน `[YOUR-PASSWORD]` ด้วยรหัสที่ตั้งตอนสร้าง project) |

---

## 4. ตั้งค่าไฟล์ `.env.local`

คัดลอกไฟล์ตัวอย่างแล้วเติมค่าจริง:

```bash
cp .env.example .env.local
```

เปิด `.env.local` แล้วกรอก:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co        # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...                 # anon public key
NEXT_PUBLIC_SITE_URL=http://localhost:3000                # ตอน dev ใช้ค่านี้
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...                     # service_role key
SUPABASE_DB_URL=postgresql://postgres:[รหัส]@db.xxxxx.supabase.co:5432/postgres   # Connection string
CRON_SECRET=ตั้งข้อความสุ่มยาวๆอะไรก็ได้
```

> `.env.local` จะไม่ถูกอัปขึ้น Git โดยอัตโนมัติ (มีใน `.gitignore` แล้ว) — ปลอดภัย

---

## 5. สร้างตารางฐานข้อมูล (migrations) + ข้อมูลเริ่มต้น

โปรเจกต์มีไฟล์ SQL ที่สร้างตารางทั้งหมด + RLS + storage buckets อยู่ใน `supabase/migrations/` เลือกทำ **ทางใดทางหนึ่ง**:

### ทางเลือก A — ใช้หน้าเว็บ Supabase (ง่ายสุด ใช้ได้ทุก OS)

1. เข้า Supabase project → เมนู **SQL Editor** → **New query**
2. เปิดไฟล์ใน `supabase/migrations/` **ทีละไฟล์เรียงตามชื่อ** (เลขวันที่น้อย→มาก) คัดลอกเนื้อหาไปวางแล้วกด **Run** ทีละไฟล์จนครบ
3. จากนั้นเปิด `supabase/seed.sql` วาง+Run (สร้าง 6 หมวดหมู่)

### ทางเลือก B — ใช้คำสั่ง (ต้องมี `psql`)

ต้องมี `psql` ในเครื่องก่อน:
- **macOS**: `brew install libpq`
- **Windows**: ติดตั้ง PostgreSQL หรือรันผ่าน Git Bash / WSL
- **Linux**: `sudo apt install postgresql-client`

> หมายเหตุ: สคริปต์ `scripts/db-apply.sh` เขียน path ของ libpq สำหรับ macOS (Apple Silicon) ไว้ ถ้าคุณใช้ OS อื่นและ `psql` อยู่ใน PATH อยู่แล้วก็รันได้ ถ้าไม่ได้ให้ใช้ทางเลือก A

```bash
npm run db:apply     # สร้างตารางทั้งหมด
npm run db:seed      # ใส่ 6 หมวดหมู่
```

### สร้างบัญชีแอดมิน (ทำหลังตารางพร้อมแล้ว ทั้ง A และ B)

คำสั่งนี้ใช้แค่ Node ไม่ต้องมี psql — ใช้ได้ทุก OS:

```bash
# ตั้งอีเมล/รหัสแอดมินเองผ่าน env (แนะนำ) แล้วรัน:
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YourStrongPass npm run seed:admin
```

หรือรัน `npm run seed:admin` เฉยๆ จะได้แอดมินดีฟอลต์ `admin@zenityx.com` / `Admin@Zenity2026` (**ควรเปลี่ยนรหัสทันที**)

---

## 6. รันโปรเจกต์

```bash
npm run dev
```

เปิด http://localhost:3000

- สมัครสมาชิกใหม่ = เป็น **ผู้ซื้อ (buyer)** อัตโนมัติ
- ล็อกอินด้วยบัญชีแอดมินที่เพิ่ง seed = เข้าหน้า `/admin` ได้
- อยากเป็น **ผู้ขาย**? สมัคร buyer ก่อน → ไปหน้าสมัครผู้ขาย → ให้แอดมินอนุมัติ (หรือแอดมินโปรโมทให้ที่ `/admin/users`)

> ถ้าล็อกอินแล้วเจอปัญหาต้องยืนยันอีเมล: เข้า Supabase → **Authentication → Providers → Email** แล้วปิด "Confirm email" (สะดวกตอน dev)

---

## 7. รู้จักโครงสร้างโปรเจกต์

อ่านสรุปฟีเจอร์และ tech stack ได้ที่ [`README.md`](../README.md)

รายละเอียดเชิงลึก (สถาปัตยกรรม, กฎการเขียนโค้ด, ทุก Phase, สิ่งที่เคยตัดสินใจไว้) อยู่ใน [`CLAUDE.md`](../CLAUDE.md) — **ไฟล์นี้สำคัญมากตอนใช้ Claude Code** (ดูข้อ 8)

```
src/app/(storefront)/  หน้าฝั่งผู้ซื้อ (หน้าแรก, สินค้า, ตะกร้า, checkout, บัญชี)
src/app/(auth)/        สมัคร/ล็อกอิน
src/app/seller/        หน้าฝั่งผู้ขาย
src/app/admin/         หน้าฝั่งแอดมิน
src/lib/               โค้ดเชื่อม Supabase, server actions, validators
supabase/migrations/   ไฟล์ SQL สร้างตาราง + RPC + RLS
```

---

## 8. พัฒนาต่อด้วย Claude Code

โปรเจกต์นี้ทำมากับ Claude Code และมีไฟล์ [`CLAUDE.md`](../CLAUDE.md) ที่ Claude Code จะ**อ่านอัตโนมัติทุกครั้ง** — มันเลยรู้บริบททั้งหมดของโปรเจกต์ตั้งแต่เริ่ม (ทำอะไรไปแล้ว, กฎการเขียนโค้ด, โครงสร้าง)

### เริ่มใช้งาน

ในโฟลเดอร์โปรเจกต์ พิมพ์:
```bash
claude
```
แล้วคุยเป็นภาษาไทยได้เลย

### หลักการเขียน prompt ที่ดี

1. **บอกเป้าหมาย + บริบท + เงื่อนไข** ไม่ใช่แค่ "ทำให้หน่อย"
   - ❌ "เพิ่มหน้าโปรไฟล์"
   - ✅ "เพิ่มปุ่มแชร์สินค้าในหน้า `/products/[id]` กดแล้วคัดลอกลิงก์ ใช้ไอคอน lucide, ภาษาไทย, ให้เข้ากับดีไซน์เดิม"
2. **ให้มันอ่านโค้ดก่อนลงมือ** — "ช่วยอ่าน `src/app/seller/products` แล้วอธิบายว่าฟอร์มสินค้าทำงานยังไง ก่อนจะเริ่มแก้"
3. **สั่งให้ทดสอบ** — "แก้เสร็จแล้วเปิดเว็บเช็คด้วยว่าไม่ error"
4. **ทำทีละงาน** — งานใหญ่ให้ซอยเป็นงานย่อย อย่าสั่งรวดเดียว 10 อย่าง
5. **ถ้าไม่แน่ใจ ให้มันเสนอทางเลือกก่อน** — "มีกี่วิธีทำ ข้อดีข้อเสียแต่ละแบบ แล้วค่อยให้ฉันเลือก"

### ตัวอย่าง prompt ตามสถานการณ์

**อยากเข้าใจโค้ดก่อน**
```
อธิบายภาพรวมว่าโปรเจกต์นี้ทำอะไรได้บ้าง และ flow การสั่งซื้อทำงานยังไงตั้งแต่กดซื้อจนจบ
```

**เพิ่มฟีเจอร์ใหม่**
```
อยากเพิ่มฟีเจอร์ "สินค้าที่ดูล่าสุด" ในหน้าแรก เก็บ 8 ชิ้นล่าสุดที่ผู้ใช้เปิดดู
ช่วยเสนอวิธีทำ (เก็บที่ไหน, กระทบตรงไหนบ้าง) ให้ฉันเลือกก่อนลงมือ
```

**แก้บั๊ก**
```
ตอนกดเพิ่มสินค้าลงตะกร้าบนมือถือ ปุ่มไม่ตอบสนอง
ช่วยหาสาเหตุจากโค้ด แล้วบอกก่อนว่าจะแก้ตรงไหน
```

**ทำงานที่เหลือของโปรเจกต์ (ดู Phase ใน CLAUDE.md)**
```
อ่าน CLAUDE.md แล้วบอกว่าเหลืออะไรต้องทำบ้าง และช่วยทำ [หัวข้อที่เลือก] ต่อให้หน่อย
```

**ปรับ/เรียนรู้**
```
รีวิวโค้ดที่ฉันเพิ่งเขียนใน [ไฟล์] ว่ามีจุดไหนพัฒนาได้ และอธิบายเหตุผลแบบสอนมือใหม่
```

### กฎเหล็กของโปรเจกต์ (Claude Code จะรู้อยู่แล้วจาก CLAUDE.md แต่คุณควรรู้ด้วย)

- Logic สำคัญ (ตัดสต๊อก/คิดเงิน/เปลี่ยนสถานะออเดอร์) ทำใน **ฟังก์ชันฐานข้อมูล (RPC)** เท่านั้น ห้ามทำฝั่ง client
- ราคา/ยอดรวมคำนวณใหม่ที่เซิร์ฟเวอร์เสมอ
- UI ภาษาไทย, mobile-first, ใช้ไอคอน lucide, **ห้ามใช้อีโมจิ**
- แก้ schema ฐานข้อมูล = เขียนไฟล์ migration ใหม่ใน `supabase/migrations/` แล้วรัน (ห้ามแก้ไฟล์เก่า)

---

## 9. นำขึ้นออนไลน์ (Deploy)

โปรเจกต์ตั้งค่าไว้สำหรับ **Vercel** — ขั้นตอนอยู่ในหัวข้อ "Deploy (Vercel)" ของ [`README.md`](../README.md)
สรุปสั้นๆ: push โค้ดขึ้น GitHub ของตัวเอง → import ใน Vercel → ใส่ environment variables ชุดเดียวกับ `.env.local` (แต่ `NEXT_PUBLIC_SITE_URL` เปลี่ยนเป็นโดเมนจริง) → Deploy

---

## 10. ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `npm run dev` แล้วขึ้น error เรื่อง Supabase URL/key | ยังไม่ได้ตั้ง `.env.local` หรือค่าผิด — ตรวจข้อ 4 |
| หน้าแรกไม่มีหมวดหมู่สินค้าขึ้น | ยังไม่ได้รัน seed หมวดหมู่ (ข้อ 5) |
| ล็อกอินแล้วค้างที่หน้ายืนยันอีเมล | ปิด Confirm email ใน Supabase (ท้ายข้อ 6) |
| `npm run db:apply` ฟ้องหา `psql` | ใช้ทางเลือก A (SQL Editor บนเว็บ) แทน |
| แก้ schema แล้วแอปฟ้อง type ไม่ตรง | ต้องอัปเดต `src/lib/supabase/database.types.ts` ให้ตรง (ขอ Claude Code ช่วยได้) |

---

ขอให้สนุกกับการพัฒนา! ติดตรงไหนถาม Claude Code ในโปรเจกต์ได้เลย มันรู้บริบททั้งหมดจาก `CLAUDE.md`
