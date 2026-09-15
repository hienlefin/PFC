"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, StatusBar } from "@/components/ui";

type Order = {
  id: string;
  status: string;
  totalVnd: number;
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
    <div className="phone-scroll">
      <StatusBar />
      <div className="page-pad">
        <h1 className="page-title">Đơn hàng</h1>
        {items.length === 0 ? (
          <div className="card muted">Chưa có đơn.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="tag">{o.status}</span>
                  <span className="price">
                    <Money vnd={o.totalVnd} />
                  </span>
                </div>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  {o.items.map((i) => i.title).join(", ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
