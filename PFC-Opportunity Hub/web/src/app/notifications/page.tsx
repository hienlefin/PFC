"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type N = {
  id: string;
  title: string;
  body: string;
  deepLink?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<N[]>([]);

  useEffect(() => {
    fetch("/api/me/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, []);

  return (
    <main className="px-4 pb-6 pt-5">
      <h1 className="mb-1 text-xl font-bold">Nhắc hạn</h1>
      <p className="mb-4 text-sm text-[var(--pfc-muted)]">
        Nhắc hạn do cron gọi API với header x-cron-secret. Không chạy từ trình duyệt.
      </p>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
            Chưa có nhắc hạn. Đăng nhập, lưu cơ hội gần deadline; cron sẽ gửi nhắc.
          </p>
        )}
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.deepLink || "/"}
            className="block rounded-2xl border border-[var(--pfc-line)] bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-[var(--pfc-purple)]">{n.title}</p>
            <p className="mt-1 text-sm">{n.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
