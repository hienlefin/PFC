"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, StatusBar, coverEmoji } from "@/components/ui";

type CartItem = {
  id: string;
  listingId: string;
  title: string;
  priceVnd: number;
  quantity: number;
  type: string;
  coverTone?: string;
};

type Cart = {
  id: string;
  items: CartItem[];
  totalVnd: number;
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
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

  async function setQty(itemId: string, quantity: number) {
    const res = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Không cập nhật được");
      return;
    }
    setCart(d.cart);
  }

  function applyPromo() {
    if (promo.trim().toUpperCase() === "PFC50K") {
      setDiscount(50000);
      setError(null);
    } else if (!promo.trim()) {
      setDiscount(0);
    } else {
      setError("Mã giảm giá không hợp lệ (thử PFC50K)");
      setDiscount(0);
    }
  }

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

  const subtotal = cart?.totalVnd ?? 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.back()}>
          ←
        </button>
        <h1>Giỏ hàng</h1>
      </div>

      <div className="page-pad">
        {error && <div className="error-banner">{error}</div>}

        {!cart ? (
          <p className="muted">Đang tải…</p>
        ) : cart.items.length === 0 ? (
          <div className="card">
            Giỏ trống. <Link href="/" style={{ color: "var(--pfc-primary)" }}>Tiếp tục mua</Link>
          </div>
        ) : (
          <>
            {cart.items.map((i) => (
              <div key={i.id} className="cart-item">
                <div className={`cart-thumb product-cover ${i.coverTone || "violet"}`}>
                  {coverEmoji(i.type)}
                </div>
                <div>
                  <strong style={{ fontSize: 14 }}>{i.title}</strong>
                  <div className="price" style={{ marginTop: 4 }}>
                    <Money vnd={i.priceVnd} />
                  </div>
                  <div className="qty">
                    <button type="button" onClick={() => setQty(i.id, Math.max(0, i.quantity - 1))}>
                      −
                    </button>
                    <span>{i.quantity}</span>
                    <button type="button" onClick={() => setQty(i.id, i.quantity + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Xóa"
                  onClick={() => setQty(i.id, 0)}
                >
                  🗑️
                </button>
              </div>
            ))}

            <div className="promo-row">
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Mã giảm giá"
              />
              <button type="button" onClick={applyPromo}>
                Áp dụng
              </button>
            </div>

            <div className="summary">
              <div className="summary-row">
                <span>Tạm tính</span>
                <Money vnd={subtotal} />
              </div>
              <div className="summary-row">
                <span>Giảm giá</span>
                <span>−{new Intl.NumberFormat("vi-VN").format(discount)}đ</span>
              </div>
              <div className="summary-row total">
                <span>Tổng cộng</span>
                <Money vnd={total} />
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: 14 }}
              disabled={busy}
              onClick={checkout}
            >
              {busy ? "Đang tạo đơn…" : "Thanh toán"}
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
