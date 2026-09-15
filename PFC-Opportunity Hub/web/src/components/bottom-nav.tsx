"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Briefcase, Bookmark, ClipboardList, Home } from "lucide-react";
import { cn } from "@/lib/format";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/opportunities", label: "Cơ hội", icon: Briefcase },
  { href: "/saved", label: "Đã lưu", icon: Bookmark },
  { href: "/applications", label: "Hồ sơ", icon: ClipboardList },
  { href: "/notifications", label: "Nhắc", icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--pfc-line)] bg-white/95 backdrop-blur">
      <ul className="grid grid-cols-5 px-1 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium",
                  active ? "text-[var(--pfc-purple)]" : "text-[var(--pfc-muted)]",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
