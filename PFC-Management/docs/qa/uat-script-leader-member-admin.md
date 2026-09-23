# CM-704 — UAT script (Leader · Member · Admin)

Demo accounts (local/staging seed):  
- Leader/Admin: `leader@pfc.vn` / `PFC123!`  
- Member: `member@pfc.vn` / `PFC123!`

Đánh dấu từng dòng khi chạy trên **staging** (hoặc local nếu staging chưa sẵn).

## Leader

| # | Scenario | Pass |
|---|----------|:----:|
| L1 | Login → home thấy club | ☐ |
| L2 | Duyệt / từ chối pending (private) kèm lý do đủ dài | ☐ |
| L3 | Gán role `ban_su_kien` / `member` | ☐ |
| L4 | Tạo task, gán member, thấy notify | ☐ |
| L5 | Review task (approve → done / request changes) | ☐ |
| L6 | Tạo activity draft → active | ☐ |
| L7 | Upload meta document + download token | ☐ |
| L8 | Link / unlink shared event | ☐ |
| L9 | Xem report / thống kê tháng | ☐ |
| L10 | Không giải tán được club (`club_transition` 400) | ☐ |

## Member

| # | Scenario | Pass |
|---|----------|:----:|
| M1 | Login member | ☐ |
| M2 | Không approve membership / không review task | ☐ |
| M3 | Nhận task assign → attach PoW → submit review | ☐ |
| M4 | Không tải doc club khác / private outsider | ☐ |
| M5 | Không thấy private club trong `search` nếu chưa join | ☐ |

## Admin / SuperAdmin

| # | Scenario | Pass |
|---|----------|:----:|
| A1 | `run_jobs` (deadline notify + purge) | ☐ |
| A2 | `metrics` snapshot | ☐ |
| A3 | Privacy `export_pii` / `privacy_anonymize` (staging only, fixture user) | ☐ |
| A4 | Ready endpoint `action=ready` → 200 | ☐ |

## Kết luận UAT

| Field | Value |
|-------|-------|
| Build / commit | |
| Environment | staging / local |
| Blockers | |
| Sign-off QA | |
| Date | |
