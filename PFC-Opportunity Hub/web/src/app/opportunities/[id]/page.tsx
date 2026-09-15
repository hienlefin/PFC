"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TYPE_LABEL } from "@/lib/format";
import { DeadlineCountdown } from "@/components/deadline-countdown";

type Detail = {
  id: string;
  title: string;
  type: string;
  summary?: string | null;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  locationText?: string | null;
  workMode: string;
  applyMode: string;
  externalUrl?: string | null;
  deadlineAt?: string | null;
  provider: { displayName: string; verificationTier: string };
};

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coverLetter, setCoverLetter] = useState("Em quan tâm cơ hội này.");
  const [cv, setCv] = useState<File | null>(null);
  const idem = useMemo(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now())), [id]);

  useEffect(() => {
    fetch(`/api/opportunities/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setItem)
      .catch(() => setError("Không tìm thấy cơ hội (có thể chưa Verified)."));

    fetch("/api/me/saves")
      .then((r) => r.json())
      .then((d) => {
        setSaved((d.items || []).some((x: { opportunityId: string }) => x.opportunityId === id));
      })
      .catch(() => undefined);
  }, [id]);

  async function toggleSave() {
    const res = await fetch(`/api/opportunities/${id}/save`, {
      method: saved ? "DELETE" : "POST",
    });
    if (res.ok) setSaved(!saved);
  }

  async function externalApply() {
    if (!item?.externalUrl) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/opportunities/${id}/apply/external`, {
        method: "POST",
        headers: { "Idempotency-Key": idem },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Apply thất bại");
        return;
      }
      window.open(data.externalUrl, "_blank", "noopener,noreferrer");
      router.push("/applications");
    } finally {
      setBusy(false);
    }
  }

  if (error && !item) {
    return <main className="p-4 text-sm text-[var(--pfc-danger)]">{error}</main>;
  }
  if (!item) return <main className="p-4 text-sm text-[var(--pfc-muted)]">Đang tải…</main>;

  const canExternal = item.applyMode !== "INTERNAL" && !!item.externalUrl;

  return (
    <main className="px-4 pb-8 pt-4">
      <button type="button" onClick={() => router.back()} className="mb-3 text-sm text-[var(--pfc-purple)]">
        ← Quay lại
      </button>
      <span className="chip">{TYPE_LABEL[item.type]}</span>
      <h1 className="mt-3 text-xl font-bold leading-snug">{item.title}</h1>
      <p className="mt-1 text-sm text-[var(--pfc-muted)]">
        {item.provider.displayName} · {item.provider.verificationTier.split("_").join(" ")}
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <DeadlineCountdown deadline={item.deadlineAt} />
        <span className="text-[var(--pfc-muted)]">{item.locationText}</span>
        <span className="text-[var(--pfc-muted)]">{item.workMode}</span>
      </div>

      {item.summary && <p className="mt-4 text-sm leading-relaxed">{item.summary}</p>}
      <section className="mt-5">
        <h2 className="text-sm font-semibold">Mô tả</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--pfc-ink)]/90">{item.description}</p>
      </section>
      {item.requirements && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">Yêu cầu</h2>
          <p className="mt-1 text-sm">{item.requirements}</p>
        </section>
      )}
      {item.benefits && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">Quyền lợi</h2>
          <p className="mt-1 text-sm">{item.benefits}</p>
        </section>
      )}

      <div className="mt-6 space-y-2">
        <button type="button" className="pfc-btn-outline pfc-btn" onClick={toggleSave}>
          {saved ? "Đã lưu" : "Lưu cơ hội"}
        </button>
        {canExternal && (
          <button type="button" className="pfc-btn" disabled={busy} onClick={externalApply}>
            {busy ? "Đang ghi nhận…" : "Ứng tuyển trên trang đối tác"}
          </button>
        )}
        {(item.applyMode === "INTERNAL" || item.applyMode === "BOTH") && (
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                let attachmentId: string | undefined;
                if (cv) {
                  const body = new FormData();
                  body.set("file", cv);
                  const up = await fetch("/api/me/cv", { method: "POST", body });
                  const uploaded = await up.json();
                  if (!up.ok) {
                    setError(uploaded.error || "Không tải được CV");
                    return;
                  }
                  attachmentId = uploaded.attachmentId;
                }
                const res = await fetch(`/api/opportunities/${id}/apply/internal`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idem + "-internal",
                  },
                  body: JSON.stringify({ coverLetter, attachmentId }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setError(typeof data.error === "string" ? data.error : "Internal apply thất bại");
                  return;
                }
                router.push("/applications");
              } finally {
                setBusy(false);
              }
            }}
          >
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2 text-sm"
              rows={3}
            />
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              className="block w-full text-xs"
            />
            <button type="submit" className="pfc-btn pfc-btn-outline" disabled={busy}>
              Nộp hồ sơ nội bộ (Internal)
            </button>
          </form>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-[var(--pfc-danger)]">{error}</p>}
      <button
        type="button"
        className="mt-4 w-full text-center text-xs text-[var(--pfc-danger)] underline"
        onClick={async () => {
          const res = await fetch(`/api/opportunities/${id}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "MISLEADING", details: "User report from detail" }),
          });
          if (res.ok) alert("Đã gửi báo cáo");
          else alert("Report thất bại");
        }}
      >
        Báo cáo tin này
      </button>
    </main>
  );
}
