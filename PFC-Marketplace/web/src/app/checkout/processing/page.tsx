"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatusBar } from "@/components/ui";

const STEPS = [
  "Đang kết nối cổng thanh toán",
  "Xác minh giao dịch",
  "Xác nhận thanh toán",
  "Hoàn tất đơn hàng",
];

function ProcessingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!redirect) return;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= STEPS.length) {
        clearInterval(timer);
        window.location.href = redirect;
      }
    }, 700);
    return () => clearInterval(timer);
  }, [redirect]);

  return (
    <div className="phone-scroll no-nav">
      <StatusBar />
      <div className="page-pad" style={{ paddingTop: 48, textAlign: "center" }}>
        <div className="mkt-spinner" />
        <h1 className="page-title" style={{ fontSize: 22 }}>
          Đang xử lý thanh toán
        </h1>
        <p className="page-sub">Vui lòng không đóng ứng dụng…</p>
        <div className="card" style={{ textAlign: "left" }}>
          {STEPS.map((label, idx) => (
            <div
              key={label}
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 10,
                color: idx <= step ? "var(--pfc-primary)" : "var(--pfc-muted)",
                fontWeight: idx <= step ? 700 : 500,
              }}
            >
              <span>{idx < step ? "✅" : idx === step ? "⏳" : "○"}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <button className="btn-outline" style={{ marginTop: 16, width: "100%" }} onClick={() => router.push("/orders")}>
          Xem đơn hàng
        </button>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<div className="page-pad">Đang tải…</div>}>
      <ProcessingInner />
    </Suspense>
  );
}
