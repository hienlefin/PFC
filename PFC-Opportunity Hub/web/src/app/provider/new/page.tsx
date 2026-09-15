"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Form adapted from jobhive post-job page */
export default function ProviderNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    type: "INTERNSHIP",
    locationText: "",
    description: "",
    requirements: "",
    applyMode: "EXTERNAL",
    externalUrl: "https://example.com/apply",
    deadlineAt: "",
  });

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/provider/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null,
          summary: form.title,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Tạo thất bại");
        return;
      }
      router.push("/provider");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-4 pb-8 pt-5">
      <h1 className="mb-4 text-xl font-bold">Tạo cơ hội (Draft)</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input name="title" value={form.title} onChange={onChange} placeholder="Tiêu đề" required className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm" />
        <select name="type" value={form.type} onChange={onChange} className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm">
          <option value="INTERNSHIP">Thực tập</option>
          <option value="JOB">Việc làm</option>
          <option value="COMPETITION">Cuộc thi</option>
          <option value="SCHOLARSHIP">Học bổng</option>
        </select>
        <input name="locationText" value={form.locationText} onChange={onChange} placeholder="Địa điểm" className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm" />
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Mô tả" required rows={4} className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm" />
        <textarea name="requirements" value={form.requirements} onChange={onChange} placeholder="Yêu cầu" rows={3} className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm" />
        <select name="applyMode" value={form.applyMode} onChange={onChange} className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm">
          <option value="EXTERNAL">External</option>
          <option value="INTERNAL">Internal</option>
          <option value="BOTH">Both</option>
        </select>
        <input name="externalUrl" value={form.externalUrl} onChange={onChange} placeholder="https://..." className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm" />
        <input name="deadlineAt" type="datetime-local" value={form.deadlineAt} onChange={onChange} className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm" />
        {error && <p className="text-sm text-[var(--pfc-danger)]">{error}</p>}
        <button type="submit" className="pfc-btn" disabled={loading}>
          {loading ? "Đang lưu…" : "Lưu Draft"}
        </button>
      </form>
    </main>
  );
}
