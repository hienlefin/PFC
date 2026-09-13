"use client";

import { useEffect, useState } from "react";
import { TYPE_LABEL } from "@/lib/format";

type Item = {
  id: string;
  title: string;
  type: string;
  provider: { displayName: string; verificationTier: string };
};

export default function ReviewerPage() {
  const [items, setItems] = useState<Item[]>([]);

  async function load() {
    const res = await fetch("/api/reviewer/queue");
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, decision: "VERIFIED" | "REJECTED") {
    const res = await fetch(`/api/reviewer/queue/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason: decision === "VERIFIED" ? "Looks good" : "Policy" }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Failed");
      return;
    }
    load();
  }

  return (
    <main className="px-4 pb-6 pt-5">
      <h1 className="mb-4 text-xl font-bold">Verification queue</h1>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
            Không có tin Pending.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--pfc-line)] bg-white p-4">
            <span className="chip">{TYPE_LABEL[item.type]}</span>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
            <p className="text-xs text-[var(--pfc-muted)]">
              {item.provider.displayName} · {item.provider.verificationTier}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="pfc-btn" onClick={() => decide(item.id, "VERIFIED")}>
                Verify
              </button>
              <button type="button" className="pfc-btn pfc-btn-outline" onClick={() => decide(item.id, "REJECTED")}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
