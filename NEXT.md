# Máy khác — làm module tiếp theo

Pull repo này về, mở đúng folder gốc trong Cursor. Không cần tạo folder, không cần tải lại SRS/ảnh. Không có lịch sử chat máy cũ. Toàn bộ ràng buộc nằm trong file.

## Đã có sẵn sau khi pull

| Thứ | Việc của máy khác |
|-----|-------------------|
| `source/` | SRS v3.0, Screen Inventory, checklist, ảnh mockup. Đừng tải lại. |
| `PFC-Opportunity Hub/` | Mẫu đã chốt: kiến trúc, ADR, `AGENTS.md`, code `web/` |
| `.cursor/skills/architecture-copilot` | Skill thiết kế. Cursor đọc khi mở repo này. |
| `.cursor/rules/` | Rule architecture, SRP, security. |

Không có trong Git, và không cần copy từ máy cũ: `node_modules`, `.next`, `.env`, database, CV, backup, lịch sử chat.

Chỉ cần chạy Opportunity Hub thì trong `PFC-Opportunity Hub/web`: copy `.env.example` thành `.env`, `npm install`, `npx prisma db push`, `npm run db:seed`, `npm run dev`. Tài khoản demo ghi trong `web/README.md`.

## Lệnh dán vào Cursor

Thay tên module. Các hub còn lại theo SRS: Personal Finance, Education, Project, Marketplace, Community. Opportunity đã có folder. Club ops đã có ở `PFC-Management/apps/club`.

```
Đọc NEXT.md, source/ (SRS v3.0, Screen Inventory, checklist, ảnh mockup) và PFC-Opportunity Hub (architecture.md, AGENTS.md, data-model.md, adrs). Làm module <TÊN MODULE> của PFC Digital Hub trong folder mới PFC-<Tên>. Đây là triển khai đã chốt từ SRS, làm cùng kiểu Opportunity Hub: pack kiến trúc rồi code. Không hỏi lại toàn bộ kiến trúc trừ khi SRS mâu thuẫn. Không bịa business rule ngoài SRS. Bounded module trong Digital Hub, không phải sản phẩm riêng. Không payment nếu SRS không giao cho module này. Không microservice sớm. UI bám ảnh trong source/.
```
