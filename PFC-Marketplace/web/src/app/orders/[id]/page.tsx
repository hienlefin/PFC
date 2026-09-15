"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money } from "@/components/ui";

type Order = {
  id: string;
  status: string;
  totalVnd: number;
  items: { title: string; quantity: number; unitPriceVnd: number }[];
  payments: { status: string; provider: string }[];
  review?: { rating: number } | null;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);

  async function load() {
    const res = await fetch("/api/orders");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const d = await res.json();
    const found = (d.items || []).find((o: Order) => o.id === id);
    setOrder(found || null);
  }

  useEffect(() => {
    load().catch(() => setError("Không tải được đơn"));
  }, [id]);

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${id}/pay`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Không khởi tạo thanh toán");
      return;
    }
    window.location.href = data.redirectUrl;
  }

  async function review() {
    setBusy(true);
    const res = await fetch(`/api/orders/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, body: "Trải nghiệm tốt" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Không gửi được review");
      return;
    }
    await load();
  }

  if (!order) {
    return (
      <main className="mkt-section">
        {error ? <div className="mkt-error">{error}</div> : "Đang tải…"}
      </main>
    );
  }

  return (
    <>
      <main className="mkt-section" style={{ paddingTop: 24 }}>
        <Link href="/orders" style={{ color: "var(--mkt-accent)", fontSize: 14 }}>
          ← Đơn hàng
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", marginTop: 10 }}>Chi tiết đơn</h1>
        <div className="mkt-chip">{order.status}</div>
        <p style={{ fontWeight: 700 }}>
          <Money vnd={order.totalVnd} />
        </p>
        <div className="mkt-card">
          {order.items.map((i, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>
                {i.title} × {i.quantity}
              </span>
              <Money vnd={i.unitPriceVnd * i.quantity} />
            </div>
          ))}
        </div>
        {order.payments?.[0] && (
          <p style={{ fontSize: 14, color: "var(--mkt-muted)" }}>
            Payment: {order.payments[0].provider} · {order.payments[0].status}
          </p>
        )}
        {error && <div className="mkt-error">{error}</div>}
        {order.status === "PENDING_PAYMENT" && (
          <button className="mkt-btn" disabled={busy} onClick={pay}>
            {busy ? "Đang chuyển…" : "Thanh toán (Mock VNPAY)"}
          </button>
        )}
        {order.status === "COMPLETED" && !order.review && (
          <div className="mkt-card" style={{ marginTop: 12 }}>
            <p style={{ marginTop: 0 }}>Đánh giá đơn (BR-008)</p>
            <label className="mkt-label">
              Sao
              <input
                className="mkt-input"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </label>
            <button className="mkt-btn" disabled={busy} onClick={review}>
              Gửi review
            </button>
          </div>
        )}
      </main>
      <BottomNav active="orders" />
    </>
  );
}
