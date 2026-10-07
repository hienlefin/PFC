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
  ADMIN: [
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
  ],
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  BUYER: "Buyer — Người mua",
  SELLER: "Seller — Người bán",
  ADMIN: "Admin — Quản trị",
};

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
  "admin.roles": "Phân quyền tài khoản",
};

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
  ADMIN: boolean;
}> {
  return PERMISSIONS.map((permission) => ({
    permission,
    label: PERMISSION_LABELS[permission],
    BUYER: hasPermission("BUYER", permission),
    SELLER: hasPermission("SELLER", permission),
    ADMIN: hasPermission("ADMIN", permission),
  }));
}
