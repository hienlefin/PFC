"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, deadlineInfo } from "@/lib/format";

export function DeadlineCountdown({
  deadline,
  className,
}: {
  deadline?: string | Date | null;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const info = deadlineInfo(deadline, now);
  const color =
    info.urgency === "imminent"
      ? "text-[var(--pfc-danger)]"
      : info.urgency === "soon" || info.urgency === "approaching"
        ? "text-[var(--pfc-amber)]"
        : "text-[var(--pfc-muted)]";

  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium tabular-nums", color, className)}>
      <Clock size={13} className={info.urgency === "imminent" ? "animate-pulse" : undefined} />
      {info.label}
    </span>
  );
}
