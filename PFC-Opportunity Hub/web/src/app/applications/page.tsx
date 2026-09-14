"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/format";
import { DeadlineCountdown } from "@/components/deadline-countdown";

type AppItem = {
  id: string;
  status: string;
  channel: string;
  attachmentId?: string | null;
  opportunity: {
    id: string;
    title: string;
    type: string;
    deadlineAt?: string | null;
    provider: { displayName: string };
  };
};

export default function ApplicationsPage() {
  const [items, setItems] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/me/applications");
    const d = await res.json();
    setItems(d.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmExternal(id: string) {
    const res = await fetch(`/api/me/applications/${id}/confirm-external`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Failed");
      return;
    }
    load();
  }

  return (
    <main className="px-4 pb-6 pt-5">
      <h1 className="mb-1 text-xl font-bold">Hồ sơ ứng tuyển</h1>
      <p className="mb-4 text-sm text-[var(--pfc-muted)]">Theo dõi internal & external apply</p>
      {loading && <p className="text-sm text-[var(--pfc-muted)]">Đang tải…</p>}
      {!loading && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[var(--pfc-line)] p-6 text-center text-sm text-[var(--pfc-muted)]">
          Chưa có đơn ứng tuyển.
        </p>
      )}
      <div className="space-y-3">
        {items.map((app) => (
          <div key={app.id} className="rounded-2xl border border-[var(--pfc-line)] bg-white p-4 shadow-sm">
            <Link href={`/opportunities/${app.opportunity.id}`} className="block">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="chip">{TYPE_LABEL[app.opportunity.type]}</span>
                <span className="rounded-full bg-[var(--pfc-purple-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--pfc-purple-dark)]">
                  {STATUS_LABEL[app.status] ?? app.status}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold">{app.opportunity.title}</h3>
              <p className="mt-1 text-xs text-[var(--pfc-muted)]">
                {app.opportunity.provider.displayName} · {app.channel}
              </p>
              <div className="mt-3">
                <DeadlineCountdown deadline={app.opportunity.deadlineAt} />
              </div>
            </Link>
            {app.attachmentId && (
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-[var(--pfc-purple)]"
                onClick={async () => {
                  const res = await fetch(`/api/attachments/${app.attachmentId}/sign`, { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) {
                    alert(data.error || "Không mở được CV");
                    return;
                  }
                  window.open(data.url, "_blank", "noopener");
                }}
              >
                Xem CV đã nộp
              </button>
            )}
            {app.channel === "EXTERNAL" && app.status === "REDIRECTED" && (
              <button type="button" className="pfc-btn mt-3" onClick={() => confirmExternal(app.id)}>
                Đã nộp bên ngoài
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
