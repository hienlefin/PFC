"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { name: string; role: string; email: string };

export function AccountBar() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/login");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex items-center justify-between px-4 pt-3 text-xs">
        <span className="text-[var(--pfc-muted)]">Chưa đăng nhập</span>
        <Link href="/login" className="font-semibold text-[var(--pfc-purple)]">
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs">
      <span className="truncate text-[var(--pfc-ink)]">
        {me.name} · {me.role}
      </span>
      <button type="button" onClick={logout} className="shrink-0 font-semibold text-[var(--pfc-purple)]">
        Thoát
      </button>
    </div>
  );
}
