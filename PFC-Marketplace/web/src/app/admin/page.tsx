"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Money, typeLabel } from "@/components/ui";

type Item = {
  id: string;
  title: string;
  type: string;
  priceVnd: number;
  seller: { displayName: string };
};

export default function AdminQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/queue");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError("Cần tài khoản admin@pfc.vn");
      return;
    }
    const d = await res.json();
    setItems(d.items || []);
  }

  useEffect(() => {
    load().catch(() => setError("Không tải queue"));
  }, []);

  async function publish(id: string) {
    const res = await fetch(`/api/admin/listings/${id}/publish`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Publish failed");
      return;
    }
    await load();
  }

  return (
    <main className="mkt-section" style={{ paddingTop: 24 }}>
      <Link href="/seller" style={{ color: "var(--mkt-accent)", fontSize: 14 }}>
        ← Seller
      </Link>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Duyệt listing</h1>
      <p style={{ color: "var(--mkt-muted)", fontSize: 14 }}>Pending → Published</p>
      {error && <div className="mkt-error">{error}</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((i) => (
          <div key={i.id} className="mkt-card">
            <span className="mkt-chip">{typeLabel(i.type)}</span>
            <h2 style={{ fontSize: "1rem", margin: "8px 0" }}>{i.title}</h2>
            <p style={{ margin: 0, color: "var(--mkt-muted)", fontSize: 14 }}>
              {i.seller.displayName} · <Money vnd={i.priceVnd} />
            </p>
            <button className="mkt-btn" style={{ marginTop: 10 }} onClick={() => publish(i.id)}>
              Publish
            </button>
          </div>
        ))}
        {items.length === 0 && !error && <div className="mkt-card">Queue trống.</div>}
      </div>
    </main>
  );
}
