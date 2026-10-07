"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/domain/permissions";

type NavItem = { href: string; label: string; icon: string; match?: (path: string) => boolean };

function baseNav(): NavItem[] {
  return [
    {
      href: "/home",
      label: "Home",
      icon: "🏠",
      match: (p) => p === "/home",
    },
    {
      href: "/",
      label: "Chợ",
      icon: "🛒",
      match: (p) =>
        p === "/" ||
        p.startsWith("/listings") ||
        p.startsWith("/cart") ||
        p.startsWith("/checkout") ||
        p.startsWith("/orders"),
    },
  ];
}

export function StatusBar() {
  const { user } = useAuth();
  return (
    <div className="status-bar">
      <span>9:41</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {user ? <span className="role-pill">{user.role}</span> : null}
        ●●● Wi‑Fi 🔋
      </span>
    </div>
  );
}

export function RoleBanner() {
  const { user, loading, can } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Link href="/login" className="role-banner">
        <span>
          <strong>Chưa đăng nhập</strong>
          <span className="muted"> — đăng nhập để mua / bán / phân quyền</span>
        </span>
        <span className="role-banner-cta">Login</span>
      </Link>
    );
  }

  return (
    <div className="role-banner in">
      <div>
        <strong>{user.name}</strong>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {ROLE_LABELS[user.role]} · {user.permissions.length} quyền
        </div>
      </div>
      <div className="role-banner-actions">
        {can("listing.create") && (
          <Link href="/seller/new" className="role-chip primary">
            + Thêm SP
          </Link>
        )}
        {can("admin.roles") && (
          <Link href="/permissions" className="role-chip primary">
            Phân quyền
          </Link>
        )}
        {!can("listing.create") && !can("admin.roles") && (
          <Link href="/more" className="role-chip">
            More
          </Link>
        )}
      </div>
    </div>
  );
}

export function PfcLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }}>
      <Image src="/pfc-logo.png" alt="PFC" width={size} height={size} priority />
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { can } = useAuth();
  if (pathname === "/login" || pathname.startsWith("/pay")) return null;

  const items: NavItem[] = [...baseNav()];

  if (can("admin.roles")) {
    // Admin: Thêm sản phẩm + Phân quyền ngay trên bottom nav
    items.push({
      href: "/seller/new",
      label: "Thêm",
      icon: "＋",
      match: (p) => p === "/seller/new" || p.startsWith("/seller"),
    });
    items.push({
      href: "/permissions",
      label: "Quyền",
      icon: "🔐",
      match: (p) => p.startsWith("/permissions") || p === "/admin",
    });
  } else if (can("listing.create")) {
    items.push({
      href: "/seller/new",
      label: "Thêm",
      icon: "＋",
      match: (p) => p === "/seller/new",
    });
    items.push({
      href: "/seller",
      label: "Seller",
      icon: "🏪",
      match: (p) => p === "/seller" || (p.startsWith("/seller/") && p !== "/seller/new"),
    });
  } else {
    items.push({
      href: "/learn",
      label: "Learn",
      icon: "📚",
      match: (p) => p.startsWith("/learn"),
    });
    items.push({
      href: "/community",
      label: "Cộng đồng",
      icon: "👥",
      match: (p) => p.startsWith("/community"),
    });
  }

  items.push({
    href: "/more",
    label: "More",
    icon: "⋯",
    match: (p) => p === "/more",
  });

  const nav = items.slice(0, 5);

  return (
    <nav className="bottom-nav">
      {nav.map((item) => {
        const active = item.match ? item.match(pathname) : pathname === item.href;
        return (
          <Link key={`${item.href}-${item.label}`} href={item.href} className={`nav-item${active ? " active" : ""}`}>
            <span className="nav-ico">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Money({ vnd }: { vnd: number }) {
  return <span>{new Intl.NumberFormat("vi-VN").format(vnd)}đ</span>;
}

export function coverEmoji(type: string) {
  switch (type) {
    case "COURSE":
      return "🎓";
    case "PHYSICAL":
      return "📘";
    case "DIGITAL":
      return "📄";
    case "SERVICE":
      return "💬";
    case "EVENT_TICKET":
      return "🎟️";
    default:
      return "🛍️";
  }
}

export function typeLabel(type: string) {
  switch (type) {
    case "COURSE":
      return "Khóa học";
    case "PHYSICAL":
      return "Sách";
    case "DIGITAL":
      return "Digital";
    case "SERVICE":
      return "Dịch vụ";
    case "EVENT_TICKET":
      return "Sự kiện";
    default:
      return type;
  }
}

export function discountPct(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
