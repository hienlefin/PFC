"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { OpportunityCard, type OppCardData } from "@/components/opportunity-card";

export default function OpportunitiesClient() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [type, setType] = useState(sp.get("type") || "ALL");
  const [sort, setSort] = useState(sp.get("sort") || "newest");
  const [items, setItems] = useState<OppCardData[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, pageSize: "20" });
    if (q) params.set("q", q);
    if (type && type !== "ALL") params.set("type", type);
    const res = await fetch(`/api/opportunities?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [q, type, sort]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/me/saves")
      .then((r) => r.json())
      .then((d) => {
        setSavedIds(new Set((d.items || []).map((x: { opportunityId: string }) => x.opportunityId)));
      })
      .catch(() => undefined);
  }, []);

  async function toggleSave(id: string) {
    const isSaved = savedIds.has(id);
    const res = await fetch(`/api/opportunities/${id}/save`, {
      method: isSaved ? "DELETE" : "POST",
    });
    if (!res.ok) return;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="px-4 pb-6 pt-5">
      <h1 className="mb-3 text-xl font-bold">Cơ hội</h1>
      <FilterBar
        q={q}
        type={type}
        sort={sort}
        onChange={(n) => {
          if (n.q !== undefined) setQ(n.q);
          if (n.type) setType(n.type);
          if (n.sort) setSort(n.sort);
        }}
      />
      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-[var(--pfc-muted)]">Đang tải…</p>}
        {!loading && items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
            Không có cơ hội phù hợp.
          </p>
        )}
        {items.map((item) => (
          <OpportunityCard
            key={item.id}
            item={item}
            saved={savedIds.has(item.id)}
            onToggleSave={toggleSave}
          />
        ))}
      </div>
    </main>
  );
}
