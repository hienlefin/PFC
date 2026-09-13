"use client";

import { useEffect, useState } from "react";
import { OpportunityCard, type OppCardData } from "@/components/opportunity-card";

export default function SavedPage() {
  const [items, setItems] = useState<OppCardData[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/me/saves");
    const data = await res.json();
    setItems((data.items || []).map((x: { opportunity: OppCardData }) => x.opportunity));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleSave(id: string) {
    await fetch(`/api/opportunities/${id}/save`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <main className="px-4 pb-6 pt-5">
      <h1 className="mb-3 text-xl font-bold">Đã lưu</h1>
      {loading && <p className="text-sm text-[var(--pfc-muted)]">Đang tải…</p>}
      {!loading && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
          Chưa lưu cơ hội nào.
        </p>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <OpportunityCard key={item.id} item={item} saved onToggleSave={toggleSave} />
        ))}
      </div>
    </main>
  );
}
