"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, StatusBar, typeLabel } from "@/components/ui";

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
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/queue");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError("Cần tài khoản Admin (admin@pfc.vn / Admin-PFC-2026)");
      setLoading(false);
      return;
    }
    const d = await res.json();
    setItems(d.items || []);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError("Không tải queue");
      setLoading(false);
    });
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
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.push("/more")} aria-label="Quay lại">
          ←
        </button>
        <h1>Duyệt listing</h1>
      </div>

      <div className="page-pad">
        <p className="page-sub" style={{ marginTop: 0 }}>
          Pending → Published · chỉ Admin
        </p>

        <Link
          href="/permissions"
          className="btn-outline"
          style={{ display: "block", textAlign: "center", marginBottom: 14 }}
        >
          Phân quyền tài khoản
        </Link>

        {error && (
          <div className="error-banner">
            {error}
            <div style={{ marginTop: 8 }}>
              <Link href="/login" style={{ color: "var(--pfc-danger)", fontWeight: 700 }}>
                Đăng nhập Admin →
              </Link>
            </div>
          </div>
        )}

        {loading ? (
          <p className="muted">Đang tải…</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((i) => (
              <div key={i.id} className="card">
                <span className="tag">{typeLabel(i.type)}</span>
                <h2 style={{ fontSize: "1rem", margin: "8px 0" }}>{i.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {i.seller.displayName} · <Money vnd={i.priceVnd} />
                </p>
                <button className="btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={() => publish(i.id)}>
                  Publish
                </button>
              </div>
            ))}
            {items.length === 0 && !error && <div className="card muted">Queue trống.</div>}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
