"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, typeLabel } from "@/components/ui";

type Listing = {
  id: string;
  title: string;
  type: string;
  status: string;
  priceVnd: number;
};

type Order = {
  id: string;
  status: string;
  totalVnd: number;
  items: { title: string }[];
  payouts: { netVnd: number; status: string }[];
};

export default function SellerPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [lRes, oRes] = await Promise.all([
      fetch("/api/seller/listings"),
      fetch("/api/seller/orders"),
    ]);
    if (lRes.status === 401 || oRes.status === 401) {
      router.push("/login");
      return;
    }
    if (lRes.status === 403) {
      setError("Tài khoản này không phải Seller. Đăng nhập seller@pfc.vn");
      return;
    }
    const l = await lRes.json();
    const o = await oRes.json();
    setListings(l.items || []);
    setOrders(o.items || []);
  }

  useEffect(() => {
    load().catch(() => setError("Không tải seller console"));
  }, []);

  async function submit(id: string) {
    const res = await fetch(`/api/seller/listings/${id}/submit`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Submit failed");
      return;
    }
    await load();
  }

  async function complete(id: string) {
    const res = await fetch(`/api/orders/${id}/complete`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Complete failed");
      return;
    }
    await load();
  }

  return (
    <>
      <main className="mkt-section" style={{ paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", margin: 0 }}>Seller</h1>
          <Link href="/seller/new" className="mkt-chip" style={{ textDecoration: "none" }}>
            + Listing
          </Link>
        </div>
        <p style={{ color: "var(--mkt-muted)", fontSize: 14 }}>
          SELL-01 · catalog & orders · payout records
        </p>
        {error && <div className="mkt-error">{error}</div>}

        <h2 style={{ fontSize: "1rem" }}>Listings</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {listings.map((l) => (
            <div key={l.id} className="mkt-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span className="mkt-chip">{typeLabel(l.type)}</span>
                <span className="mkt-chip">{l.status}</span>
              </div>
              <strong>{l.title}</strong>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <Money vnd={l.priceVnd} />
                {l.status === "DRAFT" && (
                  <button type="button" className="mkt-btn" style={{ width: "auto", padding: "6px 12px" }} onClick={() => submit(l.id)}>
                    Gửi duyệt
                  </button>
                )}
              </div>
            </div>
          ))}
          {listings.length === 0 && <div className="mkt-card">Chưa có listing.</div>}
        </div>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>Orders</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {orders.map((o) => (
            <div key={o.id} className="mkt-card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mkt-chip">{o.status}</span>
                <Money vnd={o.totalVnd} />
              </div>
              <p style={{ margin: "8px 0", fontSize: 14 }}>{o.items.map((i) => i.title).join(", ")}</p>
              {o.payouts?.[0] && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--mkt-muted)" }}>
                  Payout net <Money vnd={o.payouts[0].netVnd} /> · {o.payouts[0].status}
                </p>
              )}
              {o.status === "PROCESSING" && (
                <button
                  type="button"
                  className="mkt-btn"
                  style={{ marginTop: 10 }}
                  onClick={() => complete(o.id)}
                >
                  Đánh dấu hoàn tất
                </button>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          <Link href="/admin" style={{ color: "var(--mkt-accent)" }}>
            Hàng đợi duyệt (Admin)
          </Link>
        </p>
      </main>
      <BottomNav active="seller" />
    </>
  );
}
