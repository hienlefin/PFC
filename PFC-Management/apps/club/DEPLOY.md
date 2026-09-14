# Deploy Club Management (Vercel + Turso)

Hướng dẫn cho người **không rành devops**. Làm đúng thứ tự. Cần một máy đã cài Node.js và tài khoản GitHub (repo PFC).

App Club **không** dùng file SQLite trên internet. Máy bạn vẫn dùng SQLite khi `TURSO_DATABASE_URL` để trống. Khi deploy, điền Turso thì app nối database trên mây (ADR-007).

**Root Directory trên Vercel:** `PFC-Management/apps/club`  
**Build:** `next build` (script `npm run build` trong `package.json` — không cần sửa).

---

## Checklist nhanh

- [ ] Đã tạo database Turso và copy URL + token
- [ ] Đã chạy migrate + seed **trên Turso** (một lần trên máy bạn)
- [ ] Đã tạo project Vercel, Root Directory đúng thư mục club
- [ ] Đã set 4 biến môi trường trên Vercel (Production)
- [ ] Deploy lần đầu thành công, mở được trang login
- [ ] Đăng nhập demo: `leader@pfc.vn` / `PFC123!` (đổi mật khẩu trước khi CLB thật dùng)

---

## 0. Trên máy bạn (đã clone repo)

```bash
cd PFC-Management/apps/club
npm install
```

Copy file môi trường mẫu:

- Windows: copy `.env.example` thành `.env.local`
- Điền `CLUB_SESSION_SECRET` bằng một chuỗi dài ngẫu nhiên (chỉ trên máy bạn, không đưa lên GitHub)

Chạy local (SQLite file, **không** cần Turso):

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Mở http://localhost:3000

---

## 1. Tạo database Turso

1. Mở https://turso.tech và đăng nhập (GitHub cũng được).
2. Tạo một database, tên ví dụ: `pfc-club`.
3. Vào database → **Settings** hoặc nút connect:
   - **URL** dạng `libsql://pfc-club-xxxx.turso.io` → đây là `TURSO_DATABASE_URL`
   - Tạo **Auth token** (quyền đọc/ghi) → đây là `TURSO_AUTH_TOKEN`
4. Dán hai giá trị vào `.env.local` trên máy bạn (vẫn **không** commit file này).

Cài CLI Turso (tuỳ chọn, nếu web không hiện token): xem https://docs.turso.tech/cli/installation

Ví dụ sau khi có CLI:

```bash
turso db create pfc-club
turso db show pfc-club --url
turso db tokens create pfc-club
```

---

## 2. Đưa schema + data demo lên Turso (làm trên máy bạn)

Trong `apps/club`, file `.env.local` phải có `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`.

```bash
cd PFC-Management/apps/club
npm run db:migrate
npm run db:seed
```

Script tự đọc `.env.local`. Không có bước này thì app vẫn gọi `seedDemo` khi chạy API, nhưng **nên migrate một lần trên máy** cho chắc.

---

## 3. Tạo project trên Vercel

1. Mở https://vercel.com và đăng nhập.
2. **Add New… → Project** → Import repo GitHub `PFC---project` (hoặc repo team đang dùng).
3. Trước khi Deploy:
   - **Framework Preset:** Next.js
   - **Root Directory:** bấm Edit → chọn `PFC-Management/apps/club`
   - **Build Command:** để mặc định `next build` (trùng `package.json`)
   - **Install Command:** `npm install`
4. **Chưa bấm Deploy** — sang bước 4 set biến môi trường đã.

Nếu repo là monorepo mà Vercel không thấy `package.json`, chắc Root Directory sai.

---

## 4. Set biến môi trường trên Vercel

Vercel → Project → **Settings → Environment Variables**.  
Chọn môi trường **Production** (và Preview nếu muốn).

| Tên | Giá trị |
|-----|---------|
| `CLUB_SESSION_SECRET` | Chuỗi ngẫu nhiên dài (khác local cũng được) |
| `CLUB_SESSION_TTL_SECONDS` | `604800` |
| `TURSO_DATABASE_URL` | URL `libsql://…` từ bước 1 |
| `TURSO_AUTH_TOKEN` | Token từ bước 1 |

Không điền `CLUB_DB_PATH` trên Vercel.

Tạo secret ngẫu nhiên (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

---

## 5. Deploy lần đầu

1. Bấm **Deploy**.
2. Đợi build xanh. Nếu đỏ vì `better-sqlite3` / native module: xem log; app production dùng Turso, nhưng `npm install` vẫn cài SQLite local. Thử deploy lại một lần.
3. Vercel sẽ cho URL dạng `https://….vercel.app`.
4. Mở URL → **Đăng nhập**:
   - `leader@pfc.vn` / `PFC123!`
   - hoặc `member@pfc.vn` / `PFC123!`

Nếu login báo thiếu session secret: biến `CLUB_SESSION_SECRET` chưa có trên Vercel — thêm rồi **Redeploy**.

---

## 6. Cập nhật sau này (sửa code rồi lên web)

1. Đẩy branch / merge vào nhánh Vercel đang theo dõi (thường `main` sau khi review PR).
2. Vercel tự build lại. Không cần tạo database mới.
3. Migration SQL mới: chạy `npm run db:migrate` **trên máy** với `TURSO_*` trong `.env.local`, rồi deploy code.

---

## Ghi chú

- File `.env.local` **cấm** commit.
- SQLite file `.data/club.sqlite` chỉ cho máy bạn.
- Turso có gói free; đừng share token trong chat/PR.
- `package.json` script `build` = `next build` — đủ cho Vercel. Thiếu duy nhất là **env + Root Directory**, không thiếu script.
