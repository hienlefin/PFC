# CM-709 — Production smoke (single-club)

**Cấm:** `create_club` thành công.

| # | Step | Expected | Pass |
|---|------|----------|:----:|
| 1 | Login leader | 200 | ☐ |
| 2 | GET private club đúng quyền | 200 | ☐ |
| 3 | Outsider GET private | 403 | ☐ |
| 4 | Approve member (nếu pending) | active + history | ☐ |
| 5 | Create task → assign → PoW → review → done | FSM OK | ☐ |
| 6 | Register doc → authorize download | token works | ☐ |
| 7 | Link event → list → unlink | OK | ☐ |
| 8 | POST create_club | 400 SINGLE_CLUB | ☐ |
| 9 | GET ready | 200 | ☐ |

Commit / release: ________  
Operator: ________ Date: ________
