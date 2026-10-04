"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BottomNav, Money, StatusBar, coverEmoji } from "@/components/ui";
import { commercePolicy, resolvePromo } from "@/domain/commerce-policy";

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

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promo, setPromo] = useState("PFC50K");
  const [shipName, setShipName] = useState("Nguyen Phuong Linh");
  const [shipPhone, setShipPhone] = useState("0901234567");
  const [shipAddress, setShipAddress] = useState("Quận 1, TP. Hồ Chí Minh");

  useEffect(() => {
    const fromQuery = params.get("promo");
    if (fromQuery) setPromo(fromQuery);
  }, [params]);

  useEffect(() => {
    fetch("/api/cart")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return;
        }
        const d = await r.json();
        setCart(d.cart);
      })
      .catch(() => setError("Không tải được giỏ"));
  }, [router]);

  const totals = useMemo(() => {
    const subtotal = cart?.totalVnd ?? 0;
    const hasPhysical = (cart?.items || []).some((i) => i.type === "PHYSICAL");
    const shipping = hasPhysical ? commercePolicy.shippingPhysicalVnd : 0;
    const discount = Math.min(resolvePromo(promo), subtotal + shipping);
    const total = Math.max(0, subtotal + shipping - discount);
    return { subtotal, shipping, discount, total };
  }, [cart, promo]);

  async function continuePay() {
    if (!cart?.items.length) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `chk_${Date.now()}`,
      },
      body: JSON.stringify({
        promoCode: promo,
        shipName,
        shipPhone,
        shipAddress,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Checkout thất bại");
      return;
    }
    router.push(`/checkout/payment?orderId=${data.orderId}`);
  }

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.push("/cart")}>
          ←
        </button>
        <h1>Checkout</h1>
      </div>

      <div className="page-pad">
        {error && <div className="error-banner">{error}</div>}

        <div className="card" style={{ marginBottom: 12 }}>
          <strong>Địa chỉ giao hàng</strong>
          <label className="field" style={{ marginTop: 10 }}>
            Họ tên
            <input value={shipName} onChange={(e) => setShipName(e.target.value)} />
          </label>
          <label className="field">
            Số điện thoại
            <input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} />
          </label>
          <label className="field">
            Địa chỉ
            <textarea
              rows={2}
              value={shipAddress}
              onChange={(e) => setShipAddress(e.target.value)}
            />
          </label>
        </div>

        {!cart ? (
          <p className="muted">Đang tải…</p>
        ) : cart.items.length === 0 ? (
          <div className="card">
            Giỏ trống. <Link href="/">Tiếp tục mua</Link>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <strong>Sản phẩm</strong>
              {cart.items.map((i) => (
                <div
                  key={i.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr auto",
                    gap: 10,
                    marginTop: 10,
                    alignItems: "center",
                  }}
                >
                  <div className={`cart-thumb product-cover ${i.coverTone || "violet"}`} style={{ width: 48, height: 48, fontSize: 20 }}>
                    {coverEmoji(i.type)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{i.title}</div>
                    <div className="muted">× {i.quantity}</div>
                  </div>
                  <Money vnd={i.priceVnd * i.quantity} />
                </div>
              ))}
            </div>

            <label className="field">
              Mã giảm giá
              <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="PFC50K" />
            </label>

            <div className="summary">
              <div className="summary-row">
                <span>Tạm tính</span>
                <Money vnd={totals.subtotal} />
              </div>
              <div className="summary-row">
                <span>Phí giao hàng</span>
                <Money vnd={totals.shipping} />
              </div>
              <div className="summary-row">
                <span>Giảm giá</span>
                <span>−{new Intl.NumberFormat("vi-VN").format(totals.discount)}đ</span>
              </div>
              <div className="summary-row total">
                <span>Tổng cộng</span>
                <Money vnd={totals.total} />
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: 14 }}
              disabled={busy}
              onClick={continuePay}
            >
              {busy ? "Đang tạo đơn…" : "Tiếp tục thanh toán"}
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="page-pad">Đang tải…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
