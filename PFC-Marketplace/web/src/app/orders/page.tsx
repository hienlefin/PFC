"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money } from "@/components/ui";

type Order = {
  id: string;
  status: string;
  totalVnd: number;
  createdAt: string;
  items: { title: string; quantity: number; unitPriceVnd: number }[];
};

export default function OrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);

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

  return (
    <>
      <main className="mkt-section" style={{ paddingTop: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Đơn của tôi</h1>
        {items.length === 0 ? (
          <div className="mkt-card">Chưa có đơn.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="mkt-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mkt-chip">{o.status}</span>
                  <Money vnd={o.totalVnd} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--mkt-muted)" }}>
                  {o.items.map((i) => i.title).join(", ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav active="orders" />
    </>
  );
}
