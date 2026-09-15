"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatusBar } from "@/components/ui";

function PayResultInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Đang xác nhận thanh toán…");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const q: Record<string, string> = {};
    params.forEach((v, k) => {
      q[k] = v;
    });
    fetch(`/api/payments/callback?${new URLSearchParams(q)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Callback failed");
        setOrderId(d.order?.id ?? null);
        setMsg(
          d.payment?.status === "SUCCESS"
            ? "Thanh toán thành công"
            : d.payment?.status === "FAILED"
              ? "Thanh toán thất bại"
              : "Đã xử lý callback",
        );
      })
      .catch((e) => setMsg(e.message));
  }, [params]);

  return (
    <div className="phone-scroll no-nav">
      <StatusBar />
      <div className="page-pad" style={{ paddingTop: 28 }}>
        <h1 className="page-title">{msg}</h1>
        <div className="card muted">Provider local: MOCK (abstraction VNPAY).</div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {orderId && (
            <button className="btn-primary" onClick={() => router.push(`/orders/${orderId}`)}>
              Xem đơn hàng
            </button>
          )}
          <Link className="btn-outline" href="/" style={{ textAlign: "center" }}>
            Về Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PayResultPage() {
  return (
    <Suspense fallback={<div className="page-pad">Đang tải…</div>}>
      <PayResultInner />
    </Suspense>
  );
}
