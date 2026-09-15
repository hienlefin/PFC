"use client";

import { useEffect, useState } from "react";
import { TYPE_LABEL } from "@/lib/format";

type Item = {
  id: string;
  title: string;
  type: string;
  expireAt?: string | null;
  status: string;
};

export default function ExpiredOpsPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/provider/opportunities")
      .then((r) => r.json())
      .then((d) => {
        const all: Item[] = d.items || [];
        setItems(all.filter((x) => x.status === "EXPIRED"));
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="px-4 pb-6 pt-5">
      <h1 className="mb-1 text-xl font-bold">Expired opportunities</h1>
      <p className="mb-4 text-sm text-[var(--pfc-muted)]">OPP-A08 · tin đã hết hạn</p>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
            Chưa có tin Expired. Chạy expire job hoặc đợi hạn.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--pfc-line)] bg-white p-4">
            <span className="chip">{TYPE_LABEL[item.type]}</span>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
            <p className="text-xs text-[var(--pfc-muted)]">
              Hết hạn: {item.expireAt ? new Date(item.expireAt).toLocaleString("vi-VN") : "—"}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
