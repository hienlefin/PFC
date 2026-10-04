"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, StatusBar, coverEmoji } from "@/components/ui";

type Order = {
  id: string;
  orderCode: string;
  status: string;
  subtotalVnd: number;
  shippingVnd: number;
  discountVnd: number;
  totalVnd: number;
  paymentMethod: string | null;
  shipName: string | null;
  shipPhone: string | null;
  shipAddress: string | null;
  createdAt: string;
  items: {
    title: string;
    quantity: number;
    unitPriceVnd: number;
    listing?: { type: string; coverTone: string } | null;
  }[];
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
    const res = await fetch(`/api/orders/${id}`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Không tải được đơn");
      return;
    }
    setOrder(d.order);
  }

  useEffect(() => {
    load().catch(() => setError("Không tải được đơn"));
  }, [id]);

  async function continuePay() {
    router.push(`/checkout/payment?orderId=${id}`);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{order.orderCode}</strong>
              <span className="tag">{order.status}</span>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              {new Date(order.createdAt).toLocaleString("vi-VN")}
              {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
            </p>

            {(order.shipName || order.shipAddress) && (
              <div className="card" style={{ marginTop: 12 }}>
                <strong>Giao hàng</strong>
                <p style={{ margin: "6px 0 0" }}>
                  {order.shipName} · {order.shipPhone}
                  <br />
                  {order.shipAddress}
                </p>
              </div>
            )}

            <div className="card" style={{ marginTop: 12 }}>
              {order.items.map((i, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto",
                    gap: 8,
                    marginBottom: 8,
                    alignItems: "center",
                  }}
                >
                  <div
                    className={`cart-thumb product-cover ${i.listing?.coverTone || "violet"}`}
                    style={{ width: 40, height: 40, fontSize: 18 }}
                  >
                    {coverEmoji(i.listing?.type || "PHYSICAL")}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{i.title}</div>
                    <div className="muted">× {i.quantity}</div>
                    {order.status === "COMPLETED" && i.listing?.type === "COURSE" && (
                      <span className="muted" style={{ color: "var(--pfc-primary)" }}>
                        Bắt đầu học
                      </span>
                    )}
                    {order.status === "COMPLETED" && !order.review && i.listing?.type === "PHYSICAL" && (
                      <span className="muted">Viết đánh giá</span>
                    )}
                  </div>
                  <Money vnd={i.unitPriceVnd * i.quantity} />
                </div>
              ))}
            </div>

            <div className="summary" style={{ marginTop: 12 }}>
              <div className="summary-row">
                <span>Tạm tính</span>
                <Money vnd={order.subtotalVnd || order.totalVnd} />
              </div>
              <div className="summary-row">
                <span>Ship</span>
                <Money vnd={order.shippingVnd || 0} />
              </div>
              <div className="summary-row">
                <span>Giảm</span>
                <span>−{new Intl.NumberFormat("vi-VN").format(order.discountVnd || 0)}đ</span>
              </div>
              <div className="summary-row total">
                <span>Tổng</span>
                <Money vnd={order.totalVnd} />
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {order.status === "PENDING_PAYMENT" && (
              <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={continuePay}>
                Tiếp tục thanh toán
              </button>
            )}

            {order.status === "COMPLETED" && !order.review && (
              <div className="card" style={{ marginTop: 12 }}>
                <p style={{ marginTop: 0 }}>Viết đánh giá</p>
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
