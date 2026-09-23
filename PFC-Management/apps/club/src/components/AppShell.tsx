"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./MobileChrome";

/** Same phone shell for every route (including /tasks). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  return (
    <div className="phone-shell">
      <div className="phone-frame">
        <div
          className={`phone-scroll${hideNav ? " no-nav" : ""}`}
          id="main-content"
        >
          {children}
        </div>
        {!hideNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}
