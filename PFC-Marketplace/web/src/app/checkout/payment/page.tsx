"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BottomNav, Money, StatusBar } from "@/components/ui";

const METHODS = [
  { id: "VCB", label: "Vietcombank **** 1234", icon: "🏦" },
  { id: "MOMO", label: "MoMo", icon: "🟣" },
  { id: "ZALOPAY", label: "ZaloPay", icon: "🔵" },
  { id: "CARD", label: "Thẻ Visa / Mastercard", icon: "💳" },
  { id: "BANK", label: "Chuyển khoản ngân hàng", icon: "🏧" },
] as const;

type Order = {
  id: string;
  orderCode: string;
  totalVnd: number;
  status: string;
};

function PaymentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<string>("VCB");
  const [saveMethod, setSaveMethod] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Không tải được đơn");
        setOrder(d.order);
      })
      .catch((e) => setError(e.message));
  }, [orderId, router]);

  async function pay() {
    if (!order) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${order.id}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentMethod: method }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Không khởi tạo thanh toán");
      return;
    }
    const q = new URLSearchParams({
      orderId: order.id,
      redirect: data.redirectUrl,
      method,
    });
    router.push(`/checkout/processing?${q.toString()}`);
  }

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.back()}>
          ←
        </button>
        <h1>Phương thức thanh toán</h1>
      </div>
      <div className="page-pad">
        {error && <div className="error-banner">{error}</div>}
        {order && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="muted">Đơn {order.orderCode}</div>
            <div className="price" style={{ fontSize: 22, marginTop: 4 }}>
              <Money vnd={order.totalVnd} />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="card"
              onClick={() => setMethod(m.id)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderColor: method === m.id ? "var(--pfc-primary)" : undefined,
                boxShadow: method === m.id ? "0 0 0 1px var(--pfc-primary)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  <span style={{ marginRight: 8 }}>{m.icon}</span>
                  {m.label}
                </span>
                <span>{method === m.id ? "●" : "○"}</span>
              </div>
            </button>
          ))}
        </div>

        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            margin: "14px 0",
            color: "var(--pfc-muted)",
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={saveMethod}
            onChange={(e) => setSaveMethod(e.target.checked)}
          />
          Lưu phương thức này cho lần sau
        </label>

        <button className="btn-primary" style={{ width: "100%" }} disabled={busy || !order} onClick={pay}>
          {busy ? "Đang xử lý…" : order ? `Thanh toán ${new Intl.NumberFormat("vi-VN").format(order.totalVnd)}đ` : "Thanh toán"}
        </button>
        <p className="muted" style={{ marginTop: 10 }}>
          Local dùng Mock gateway (ADR-002). UI chọn cổng; không gắn logic vendor vào page.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

export default function PaymentMethodPage() {
  return (
    <Suspense fallback={<div className="page-pad">Đang tải…</div>}>
      <PaymentInner />
    </Suspense>
  );
}
