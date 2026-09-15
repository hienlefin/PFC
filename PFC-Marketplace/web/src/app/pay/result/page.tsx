"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PayResultInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Đang xác nhận thanh toán…");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const q: Record<string, string> = {};
    params.forEach((v, k) => {
      q[k] = v;
    });
    const qs = new URLSearchParams(q).toString();
    fetch(`/api/payments/callback?${qs}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Callback failed");
        setOk(Boolean(d.payment?.status === "SUCCESS" || d.order));
        setOrderId(d.order?.id ?? null);
        setMsg(
          d.payment?.status === "SUCCESS"
            ? "Thanh toán thành công"
            : d.payment?.status === "FAILED"
              ? "Thanh toán thất bại — bạn có thể thử lại"
              : "Đã xử lý callback",
        );
      })
      .catch((e) => {
        setOk(false);
        setMsg(e.message);
      });
  }, [params]);

  return (
    <main className="mkt-section" style={{ paddingTop: 40 }}>
      <div className="mkt-brand" style={{ color: "var(--mkt-accent)" }}>
        PFC Marketplace
      </div>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{msg}</h1>
      <div className="mkt-card">
        Provider local: <strong>MOCK</strong> (cùng abstraction với VNPAY — ADR-002).
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {orderId && (
          <button className="mkt-btn" onClick={() => router.push(`/orders/${orderId}`)}>
            Xem đơn hàng
          </button>
        )}
        <Link className="mkt-btn mkt-btn-ghost" href="/" style={{ textAlign: "center" }}>
          Về chợ
        </Link>
      </div>
      {!ok && <p style={{ color: "var(--mkt-muted)", fontSize: 14 }}>Nếu lỗi, mở lại đơn và bấm Thanh toán.</p>}
    </main>
  );
}

export default function PayResultPage() {
  return (
    <Suspense fallback={<main className="mkt-section">Đang tải…</main>}>
      <PayResultInner />
    </Suspense>
  );
}
