import type { MemberRole } from "@prisma/client";

/** Fine-grained Marketplace permissions (deny by default). */
export const PERMISSIONS = [
  "catalog.browse",
  "cart.manage",
  "order.buy",
  "order.view_own",
  "listing.create",
  "listing.submit",
  "seller.console",
  "admin.queue",
  "admin.publish",
  "admin.roles",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Chỉ 2 vai trò CLB này được vào màn Phân quyền / đổi role. */
export const CLUB_LEADERSHIP_ROLES = ["CHU_NHIEM", "TRUONG_CLB"] as const;
export type ClubLeadershipRole = (typeof CLUB_LEADERSHIP_ROLES)[number];

const LEADERSHIP_PERMS: readonly Permission[] = [
  "catalog.browse",
  "cart.manage",
  "order.buy",
  "order.view_own",
  "listing.create",
  "listing.submit",
  "seller.console",
  "admin.queue",
  "admin.publish",
  "admin.roles",
];

const ROLE_PERMISSIONS: Record<MemberRole, readonly Permission[]> = {
  BUYER: [
    "catalog.browse",
    "cart.manage",
    "order.buy",
    "order.view_own",
  ],
  SELLER: [
    "catalog.browse",
    "cart.manage",
    "order.buy",
    "order.view_own",
    "listing.create",
    "listing.submit",
    "seller.console",
  ],
  CHU_NHIEM: LEADERSHIP_PERMS,
  TRUONG_CLB: LEADERSHIP_PERMS,
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  BUYER: "Buyer — Người mua",
  SELLER: "Seller — Người bán",
  CHU_NHIEM: "Chủ nhiệm câu lạc bộ",
  TRUONG_CLB: "Trưởng câu lạc bộ",
};

export const ALL_ROLES = ["BUYER", "SELLER", "CHU_NHIEM", "TRUONG_CLB"] as const satisfies readonly MemberRole[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "catalog.browse": "Xem catalog / chi tiết sản phẩm",
  "cart.manage": "Giỏ hàng & checkout",
  "order.buy": "Đặt hàng & thanh toán",
  "order.view_own": "Xem đơn hàng của mình",
  "listing.create": "Thêm / tạo sản phẩm",
  "listing.submit": "Gửi listing duyệt",
  "seller.console": "Seller Center",
  "admin.queue": "Hàng đợi duyệt listing",
  "admin.publish": "Publish listing",
  "admin.roles": "Phân quyền (chỉ Chủ nhiệm / Trưởng CLB)",
};

export function isClubLeadership(role: MemberRole): boolean {
  return (CLUB_LEADERSHIP_ROLES as readonly string[]).includes(role);
}

export function permissionsForRole(role: MemberRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: MemberRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function roleMatrix(): Array<{
  permission: Permission;
  label: string;
  BUYER: boolean;
  SELLER: boolean;
  CHU_NHIEM: boolean;
  TRUONG_CLB: boolean;
}> {
  return PERMISSIONS.map((permission) => ({
    permission,
    label: PERMISSION_LABELS[permission],
    BUYER: hasPermission("BUYER", permission),
    SELLER: hasPermission("SELLER", permission),
    CHU_NHIEM: hasPermission("CHU_NHIEM", permission),
    TRUONG_CLB: hasPermission("TRUONG_CLB", permission),
  }));
}
