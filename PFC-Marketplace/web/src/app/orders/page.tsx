"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav, Money, StatusBar } from "@/components/ui";

type Order = {
  id: string;
  orderCode: string;
  status: string;
  totalVnd: number;
  createdAt: string;
  items: { title: string; quantity: number; unitPriceVnd: number }[];
};

const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_PAYMENT,PAID,PROCESSING", label: "Đang xử lý" },
  { key: "COMPLETED", label: "Hoàn tất" },
  { key: "CANCELLED,REFUNDED", label: "Đã hủy" },
] as const;

export default function OrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetch("/api/orders").then(async (r) => {
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      const d = await r.json();
      setItems(d.items || []);
    });
  }, [router]);

  const filtered = useMemo(() => {
    const keys = TABS[tab].key.split(",");
    if (keys[0] === "ALL") return items;
    return items.filter((o) => keys.includes(o.status));
  }, [items, tab]);

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="page-pad">
        <h1 className="page-title">Đơn hàng</h1>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }}>
          {TABS.map((t, idx) => (
            <button
              key={t.label}
              type="button"
              className="tag"
              onClick={() => setTab(idx)}
              style={{
                background: tab === idx ? "var(--pfc-primary)" : undefined,
                color: tab === idx ? "#fff" : undefined,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card muted">Chưa có đơn.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13 }}>{o.orderCode || o.id.slice(0, 8)}</strong>
                  <span className="tag">{o.status}</span>
                </div>
                <p className="muted" style={{ margin: "8px 0" }}>
                  {o.items.map((i) => i.title).join(", ")}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="price">
                    <Money vnd={o.totalVnd} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
