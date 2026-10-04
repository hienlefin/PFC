"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Money, StatusBar } from "@/components/ui";

function PayResultInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Đang xác nhận thanh toán…");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const q: Record<string, string> = {};
    params.forEach((v, k) => {
      q[k] = v;
    });
    fetch(`/api/payments/callback?${new URLSearchParams(q)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Callback failed");
        const success = d.payment?.status === "SUCCESS";
        setOk(success);
        setOrderId(d.order?.id ?? null);
        setOrderCode(d.order?.orderCode ?? null);
        setTotal(d.order?.totalVnd ?? null);
        setMsg(success ? "Thanh toán thành công!" : "Thanh toán thất bại");
      })
      .catch((e) => {
        setOk(false);
        setMsg(e.message);
      });
  }, [params]);

  return (
    <div className="phone-scroll no-nav">
      <StatusBar />
      <div className="page-pad" style={{ paddingTop: 40, textAlign: "center" }}>
        <div
          style={{
            width: 84,
            height: 84,
            margin: "0 auto 16px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
            background: ok ? "#dcfce7" : "#ffe4e6",
          }}
        >
          {ok ? "✅" : "⚠️"}
        </div>
        <h1 className="page-title" style={{ fontSize: 24 }}>
          {msg}
        </h1>
        {ok && (
          <p className="page-sub">Đơn hàng của bạn đã được xác nhận.</p>
        )}
        <div className="card" style={{ textAlign: "left" }}>
          {orderCode && (
            <div className="summary-row">
              <span>Mã đơn</span>
              <strong>{orderCode}</strong>
            </div>
          )}
          {total != null && (
            <div className="summary-row total">
              <span>Tổng thanh toán</span>
              <Money vnd={total} />
            </div>
          )}
          <p className="muted" style={{ marginBottom: 0 }}>
            Provider local: MOCK (abstraction VNPAY).
          </p>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {orderId && (
            <button className="btn-primary" onClick={() => router.push(`/orders/${orderId}`)}>
              Xem chi tiết đơn
            </button>
          )}
          <Link className="btn-outline" href="/" style={{ textAlign: "center" }}>
            Về trang chủ
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
