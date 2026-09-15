"use client";

import { TYPE_LABEL } from "@/lib/format";

const TYPES = ["ALL", "INTERNSHIP", "JOB", "COMPETITION", "SCHOLARSHIP"] as const;

export function FilterBar({
  q,
  type,
  sort,
  onChange,
}: {
  q: string;
  type: string;
  sort: string;
  onChange: (next: { q?: string; type?: string; sort?: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => onChange({ q: e.target.value })}
        placeholder="Tìm kiếm cơ hội..."
        className="w-full rounded-xl border border-[var(--pfc-line)] bg-[var(--pfc-purple-soft)]/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--pfc-purple)]"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="chip shrink-0"
            data-active={type === t}
            onClick={() => onChange({ type: t })}
          >
            {t === "ALL" ? "Tất cả" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-[12px]">
        <button
          type="button"
          className="chip"
          data-active={sort === "newest"}
          onClick={() => onChange({ sort: "newest" })}
        >
          Mới nhất
        </button>
        <button
          type="button"
          className="chip"
          data-active={sort === "deadline"}
          onClick={() => onChange({ sort: "deadline" })}
        >
          Sắp hết hạn
        </button>
      </div>
    </div>
  );
}
