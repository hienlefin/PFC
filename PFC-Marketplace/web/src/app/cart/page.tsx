"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money } from "@/components/ui";

type Cart = {
  id: string;
  items: { id: string; title: string; priceVnd: number; quantity: number; type: string }[];
  totalVnd: number;
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/cart");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const d = await res.json();
    setCart(d.cart);
  }

  useEffect(() => {
    load().catch(() => setError("Không tải được giỏ"));
  }, []);

  async function checkout() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `ui_${Date.now()}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Checkout thất bại");
      return;
    }
    router.push(`/orders/${data.orderId}`);
  }

  return (
    <>
      <main className="mkt-section" style={{ paddingTop: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Giỏ hàng</h1>
        {error && <div className="mkt-error">{error}</div>}
        {!cart ? (
          <p>Đang tải…</p>
        ) : cart.items.length === 0 ? (
          <div className="mkt-card">
            Giỏ trống. <Link href="/">Tiếp tục mua</Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              {cart.items.map((i) => (
                <div key={i.id} className="mkt-card">
                  <strong>{i.title}</strong>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span>× {i.quantity}</span>
                    <Money vnd={i.priceVnd * i.quantity} />
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Tổng: <Money vnd={cart.totalVnd} />
            </p>
            <button className="mkt-btn" disabled={busy} onClick={checkout}>
              {busy ? "Đang tạo đơn…" : "Checkout"}
            </button>
          </>
        )}
      </main>
      <BottomNav active="cart" />
    </>
  );
}
