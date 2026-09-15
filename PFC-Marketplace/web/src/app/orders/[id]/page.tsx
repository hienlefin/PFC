"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, StatusBar } from "@/components/ui";

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
    setOrder((d.items || []).find((o: Order) => o.id === id) || null);
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

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.push("/orders")}>
          ←
        </button>
        <h1>Chi tiết đơn</h1>
      </div>
      <div className="page-pad">
        {!order ? (
          <p className="muted">{error || "Đang tải…"}</p>
        ) : (
          <>
            <div className="tag">{order.status}</div>
            <p className="price" style={{ fontSize: 22, margin: "10px 0" }}>
              <Money vnd={order.totalVnd} />
            </p>
            <div className="card">
              {order.items.map((i, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                >
                  <span>
                    {i.title} × {i.quantity}
                  </span>
                  <Money vnd={i.unitPriceVnd * i.quantity} />
                </div>
              ))}
            </div>
            {order.payments?.[0] && (
              <p className="muted">
                Payment: {order.payments[0].provider} · {order.payments[0].status}
              </p>
            )}
            {error && <div className="error-banner">{error}</div>}
            {order.status === "PENDING_PAYMENT" && (
              <button className="btn-primary" style={{ width: "100%" }} disabled={busy} onClick={pay}>
                Thanh toán
              </button>
            )}
            {order.status === "COMPLETED" && !order.review && (
              <div className="card" style={{ marginTop: 12 }}>
                <p style={{ marginTop: 0 }}>Đánh giá đơn</p>
                <label className="field">
                  Sao
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                  />
                </label>
                <button className="btn-primary" style={{ width: "100%" }} disabled={busy} onClick={review}>
                  Gửi review
                </button>
              </div>
            )}
            <p style={{ marginTop: 12 }}>
              <Link href="/" style={{ color: "var(--pfc-primary)" }}>
                ← Marketplace
              </Link>
            </p>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
