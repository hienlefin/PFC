import { Suspense } from "react";
import OpportunitiesClient from "./opportunities-client";

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<main className="p-4 text-sm text-[var(--pfc-muted)]">Đang tải…</main>}>
      <OpportunitiesClient />
    </Suspense>
  );
}
