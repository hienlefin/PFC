"use client";

import { useEffect, useState } from "react";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/format";

type App = {
  id: string;
  status: string;
  channel: string;
  coverLetter?: string | null;
  member: { name: string; email: string };
  opportunity: { id: string; title: string; type: string };
};

const NEXT: Record<string, Array<"UNDER_REVIEW" | "ACCEPTED" | "REJECTED">> = {
  SUBMITTED: ["UNDER_REVIEW", "ACCEPTED", "REJECTED"],
  UNDER_REVIEW: ["ACCEPTED", "REJECTED"],
  REDIRECTED: ["UNDER_REVIEW", "ACCEPTED", "REJECTED"],
};

export default function ProviderApplicantsPage() {
  const [items, setItems] = useState<App[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/provider/applicants");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Cần cookie provider");
      return;
    }
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/provider/applicants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
      <h1 className="mb-1 text-xl font-bold">Applicants</h1>
      <p className="mb-4 text-sm text-[var(--pfc-muted)]">Đổi stage hồ sơ · object-level authz</p>
      {error && <p className="mb-3 text-sm text-[var(--pfc-danger)]">{error}</p>}
      <div className="space-y-3">
        {items.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
            Chưa có ứng viên.
          </p>
        )}
        {items.map((app) => (
          <div key={app.id} className="rounded-2xl border border-[var(--pfc-line)] bg-white p-4">
            <div className="mb-2 flex justify-between gap-2">
              <span className="chip">{TYPE_LABEL[app.opportunity.type]}</span>
              <span className="text-[11px] font-semibold text-[var(--pfc-purple-dark)]">
                {STATUS_LABEL[app.status] ?? app.status}
              </span>
            </div>
            <h3 className="font-semibold">{app.opportunity.title}</h3>
            <p className="mt-1 text-xs text-[var(--pfc-muted)]">
              {app.member.name} · {app.member.email} · {app.channel}
            </p>
            {app.coverLetter && <p className="mt-2 text-sm">{app.coverLetter}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(NEXT[app.status] || []).map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setStatus(app.id, s)}>
                  → {STATUS_LABEL[s] ?? s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
