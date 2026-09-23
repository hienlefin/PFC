/**
 * Pure catalog of demo logins (safe for client components).
 * Seeding logic lives in `role-demo-accounts.ts`.
 */
import type { Position } from "@/domain/permissions";

export const DEMO_PASSWORD = "PFC123!";

export type RoleDemoAccount = {
  email: string;
  fullName: string;
  position: Position;
  status: "active" | "pending";
  teamName: string | null;
  labelVi: string;
  id: string;
};

/** One account per ADR-003 position + pending for queue UI */
export const ROLE_DEMO_ACCOUNTS: readonly RoleDemoAccount[] = [
  {
    id: "role-demo-owner",
    email: "leader@pfc.vn",
    fullName: "Nguyen Phuong Linh",
    position: "owner",
    status: "active",
    teamName: "Ban Chuyên môn",
    labelVi: "Chủ nhiệm (owner)",
  },
  {
    id: "role-demo-leader",
    email: "exec@pfc.vn",
    fullName: "Tran Ban Dieu Hanh",
    position: "leader",
    status: "active",
    teamName: "Ban Đối ngoại",
    labelVi: "Ban điều hành (leader)",
  },
  {
    id: "role-demo-cm",
    email: "chuyenmon@pfc.vn",
    fullName: "Le Minh Anh",
    position: "ban_chuyen_mon",
    status: "active",
    teamName: "Ban Chuyên môn",
    labelVi: "Trưởng ban Chuyên môn",
  },
  {
    id: "role-demo-tt",
    email: "truyenthong@pfc.vn",
    fullName: "Pham Thu Ha",
    position: "ban_truyen_thong",
    status: "active",
    teamName: "Ban Truyền thông",
    labelVi: "Trưởng ban Truyền thông",
  },
  {
    id: "role-demo-sk",
    email: "sukien@pfc.vn",
    fullName: "Hoang Gia Bao",
    position: "ban_su_kien",
    status: "active",
    teamName: "Ban Sự kiện",
    labelVi: "Trưởng ban Sự kiện",
  },
  {
    id: "role-demo-member",
    email: "member@pfc.vn",
    fullName: "Tran Minh Duc",
    position: "member",
    status: "active",
    teamName: "Ban Chuyên môn",
    labelVi: "Thành viên (member)",
  },
  {
    id: "role-demo-pending",
    email: "pending@pfc.vn",
    fullName: "Ngo Cho Duyet",
    position: "member",
    status: "pending",
    teamName: null,
    labelVi: "Chờ duyệt (pending)",
  },
] as const;
