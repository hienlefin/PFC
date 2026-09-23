"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./MobileChrome";

export function PhoneShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  return (
    <div className="phone-shell">
      <div className="phone-frame">
        <div className={`phone-scroll${hideNav ? " no-nav" : ""}`}>{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
