"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Trang chủ", icon: "🏠" },
  { href: "/members", label: "Thành viên", icon: "👥" },
  { href: "/tasks", label: "Công việc", icon: "✅" },
  { href: "/events", label: "Sự kiện", icon: "📅" },
  { href: "/manage", label: "Quản lý", icon: "⚙️" },
] as const;

export function PfcLogo({
  size = 36,
  className = "logo-mark",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={className} style={{ width: size, height: size }}>
      <Image
        src="/pfc-logo.png"
        alt="Personal Finance Club"
        width={size}
        height={size}
        priority
      />
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${active ? " active" : ""}`}
          >
            <span className="nav-ico">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <span>●●● Wi‑Fi 🔋</span>
    </div>
  );
}

export function AppHeader({
  title,
  showSearch = false,
}: {
  title?: string;
  showSearch?: boolean;
}) {
  return (
    <div className="app-header">
      <Link href="/" aria-label="Về trang chủ">
        <PfcLogo />
      </Link>
      {showSearch ? (
        <div className="search-pill">🔍 Tìm kiếm trong CLB...</div>
      ) : (
        <h1>{title}</h1>
      )}
      <button type="button" className="icon-btn" aria-label="Thông báo">
        🔔
      </button>
    </div>
  );
}
