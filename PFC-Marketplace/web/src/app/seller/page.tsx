"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, StatusBar, typeLabel } from "@/components/ui";

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

const STATUS_VI: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ duyệt",
  PUBLISHED: "Đã đăng",
  UNPUBLISHED: "Ẩn",
  ARCHIVED: "Lưu trữ",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
};

export default function SellerPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [lRes, oRes] = await Promise.all([
      fetch("/api/seller/listings"),
      fetch("/api/seller/orders"),
    ]);
    if (lRes.status === 401 || oRes.status === 401) {
      router.push("/login");
      return;
    }
    if (lRes.status === 403) {
      setError("Tài khoản này không phải Seller. Đăng nhập seller@pfc.vn / Seller-PFC-2026");
      setLoading(false);
      return;
    }
    const l = await lRes.json();
    const o = await oRes.json();
    setListings(l.items || []);
    setOrders(o.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError("Không tải Seller Center");
      setLoading(false);
    });
  }, []);

  async function submit(id: string) {
    const res = await fetch(`/api/seller/listings/${id}/submit`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Gửi duyệt thất bại");
      return;
    }
    await load();
  }

  async function complete(id: string) {
    const res = await fetch(`/api/orders/${id}/complete`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Hoàn tất thất bại");
      return;
    }
    await load();
  }

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.push("/more")} aria-label="Quay lại">
          ←
        </button>
        <h1>Seller Center</h1>
      </div>

      <div className="page-pad">
        <p className="page-sub" style={{ marginTop: 0 }}>
          Quản lý sản phẩm & đơn hàng của bạn
        </p>

        <Link href="/seller/new" className="btn-primary" style={{ display: "block", textAlign: "center", marginBottom: 16 }}>
          + Thêm sản phẩm
        </Link>

        {error && (
          <div className="error-banner">
            {error}
            <div style={{ marginTop: 8 }}>
              <Link href="/login" style={{ color: "var(--pfc-danger)", fontWeight: 700 }}>
                Đăng nhập Seller →
              </Link>
            </div>
          </div>
        )}

        <div className="section-head">
          <h2>Sản phẩm của tôi</h2>
          <Link href="/seller/new">Thêm</Link>
        </div>

        {loading ? (
          <p className="muted">Đang tải…</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {listings.map((l) => (
              <div key={l.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span className="tag">{typeLabel(l.type)}</span>
                  <span className="tag">{STATUS_VI[l.status] || l.status}</span>
                </div>
                <strong style={{ display: "block", marginBottom: 6 }}>{l.title}</strong>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="price">
                    <Money vnd={l.priceVnd} />
                  </span>
                  {l.status === "DRAFT" && (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: "8px 12px", fontSize: 13 }}
                      onClick={() => submit(l.id)}
                    >
                      Gửi duyệt
                    </button>
                  )}
                </div>
              </div>
            ))}
            {listings.length === 0 && !error && (
              <div className="card muted">
                Chưa có sản phẩm. Bấm <strong>Thêm sản phẩm</strong> để tạo listing đầu tiên.
              </div>
            )}
          </div>
        )}

        <div className="section-head">
          <h2>Đơn hàng</h2>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="tag">{STATUS_VI[o.status] || o.status}</span>
                <span className="price">
                  <Money vnd={o.totalVnd} />
                </span>
              </div>
              <p style={{ margin: "8px 0", fontSize: 14 }}>{o.items.map((i) => i.title).join(", ")}</p>
              {o.payouts?.[0] && (
                <p className="muted" style={{ margin: 0 }}>
                  Payout net <Money vnd={o.payouts[0].netVnd} /> · {o.payouts[0].status}
                </p>
              )}
              {o.status === "PROCESSING" && (
                <button type="button" className="btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={() => complete(o.id)}>
                  Đánh dấu hoàn tất
                </button>
              )}
            </div>
          ))}
          {!loading && orders.length === 0 && <div className="card muted">Chưa có đơn.</div>}
        </div>

        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/admin" style={{ color: "var(--pfc-primary)", fontWeight: 650 }}>
            Hàng đợi duyệt (Admin)
          </Link>
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
