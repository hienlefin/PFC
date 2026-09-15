"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/", label: "Marketplace", icon: "🛒" },
  { href: "/learn", label: "Learn", icon: "📚" },
  { href: "/community", label: "Community", icon: "👥" },
  { href: "/more", label: "More", icon: "⋯" },
] as const;

export function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <span>●●● Wi‑Fi 🔋</span>
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
  if (pathname === "/login" || pathname.startsWith("/pay")) return null;

  return (
    <nav className="bottom-nav">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/" || pathname.startsWith("/listings") || pathname.startsWith("/cart")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
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
