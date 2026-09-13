import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OpportunityCard } from "@/components/opportunity-card";
import { TYPE_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const featured = await prisma.oppOpportunity.findMany({
    where: {
      status: "VERIFIED",
      OR: [{ expireAt: null }, { expireAt: { gt: now } }],
    },
    orderBy: { deadlineAt: "asc" },
    take: 4,
    include: { provider: { select: { displayName: true } } },
  });

  const types = ["INTERNSHIP", "JOB", "COMPETITION", "SCHOLARSHIP"] as const;

  return (
    <main className="px-4 pb-6 pt-5">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pfc-purple)]">PFC Digital Hub</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--pfc-ink)]">Opportunity Hub</h1>
        <p className="mt-1 text-sm text-[var(--pfc-muted)]">
          Học · Kết nối · Phát triển — tìm thực tập, việc làm, học bổng và cuộc thi.
        </p>
      </header>

      <section className="mb-5 rounded-2xl bg-[var(--pfc-purple)] p-4 text-white">
        <p className="text-sm font-medium opacity-90">Cùng tạo tác động lớn hơn</p>
        <p className="mt-1 text-lg font-semibold">Featured Opportunities</p>
        <Link href="/opportunities" className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--pfc-purple)]">
          Xem tất cả
        </Link>
      </section>

      <section className="mb-5">
        <div className="mb-2 grid grid-cols-4 gap-2">
          {types.map((t) => (
            <Link
              key={t}
              href={`/opportunities?type=${t}`}
              className="rounded-2xl border border-[var(--pfc-line)] bg-white p-3 text-center text-[11px] font-semibold text-[var(--pfc-purple-dark)]"
            >
              {TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Sắp hết hạn</h2>
          <Link href="/opportunities?sort=deadline" className="text-xs font-semibold text-[var(--pfc-purple)]">
            Xem thêm
          </Link>
        </div>
        {featured.map((item) => (
          <OpportunityCard key={item.id} item={item} />
        ))}
      </section>
    </main>
  );
}
