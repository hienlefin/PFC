"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { TYPE_LABEL } from "@/lib/format";
import { DeadlineCountdown } from "./deadline-countdown";

export type OppCardData = {
  id: string;
  title: string;
  type: string;
  summary?: string | null;
  locationText?: string | null;
  deadlineAt?: string | Date | null;
  provider?: { displayName: string };
};

export function OpportunityCard({
  item,
  saved,
  onToggleSave,
}: {
  item: OppCardData;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-[var(--pfc-line)] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="chip">{TYPE_LABEL[item.type] ?? item.type}</span>
        {onToggleSave && (
          <button
            type="button"
            aria-label={saved ? "Bỏ lưu" : "Lưu"}
            onClick={() => onToggleSave(item.id)}
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--pfc-purple)]"
          >
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <Link href={`/opportunities/${item.id}`} className="block">
        <h3 className="text-[15px] font-semibold leading-snug text-[var(--pfc-ink)]">{item.title}</h3>
        <p className="mt-1 text-[12px] text-[var(--pfc-muted)]">
          {item.provider?.displayName}
          {item.locationText ? ` · ${item.locationText}` : ""}
        </p>
        {item.summary && (
          <p className="mt-2 line-clamp-2 text-[13px] text-[var(--pfc-ink)]/80">{item.summary}</p>
        )}
        <div className="mt-3 border-t border-[var(--pfc-line)] pt-3">
          <DeadlineCountdown deadline={item.deadlineAt} />
        </div>
      </Link>
    </article>
  );
}
