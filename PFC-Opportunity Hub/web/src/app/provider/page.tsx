"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TYPE_LABEL } from "@/lib/format";

type Item = {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
};

export default function ProviderPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/provider/opportunities");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Cần đăng nhập bằng tài khoản provider");
      return;
    }
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(id: string) {
    const res = await fetch(`/api/provider/opportunities/${id}/submit`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Submit failed");
      return;
    }
    load();
  }

  return (
    <main className="px-4 pb-6 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Provider console</h1>
        <Link href="/provider/new" className="rounded-full bg-[var(--pfc-purple)] px-3 py-1.5 text-xs font-semibold text-white">
          + Tạo mới
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link href="/provider/applicants" className="chip">Applicants</Link>
        <Link href="/provider/expired" className="chip">Expired</Link>
        <Link href="/reviewer" className="chip">Reviewer</Link>
      </div>
      {error && (
        <p className="mb-3 text-sm text-[var(--pfc-danger)]">
          {error}. Đăng nhập provider@pfc.vn
        </p>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--pfc-line)] bg-white p-4">
            <div className="mb-1 flex justify-between gap-2">
              <span className="chip">{TYPE_LABEL[item.type]}</span>
              <span className="text-[11px] font-semibold text-[var(--pfc-muted)]">{item.status}</span>
            </div>
            <h3 className="font-semibold">{item.title}</h3>
            {item.status === "DRAFT" && (
              <button type="button" className="pfc-btn mt-3" onClick={() => submit(item.id)}>
                Gửi duyệt (Draft → Pending)
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
