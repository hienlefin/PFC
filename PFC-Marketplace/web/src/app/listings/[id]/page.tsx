"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BottomNav,
  Money,
  StatusBar,
  coverEmoji,
  discountPct,
} from "@/components/ui";

type Listing = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  description: string;
  priceVnd: number;
  compareAtVnd: number | null;
  deliveryMeta: string | null;
  serviceMeta: string | null;
  inventoryQty: number | null;
  ratingAvg: number;
  ratingCount: number;
  coverTone: string;
  seller: { displayName: string };
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Not found");
        setItem(d.item);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function addCart(thenBuy: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId: id, quantity: 1 }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      setError(data.error || "Không thêm được giỏ");
      return;
    }
    router.push(thenBuy ? "/cart" : "/cart");
  }

  if (error && !item) {
    return (
      <div className="phone-scroll">
        <StatusBar />
        <div className="page-pad">
          <div className="error-banner">{error}</div>
          <Link href="/">← Marketplace</Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="phone-scroll">
        <StatusBar />
        <div className="page-pad muted">Đang tải…</div>
      </div>
    );
  }

  const pct = discountPct(item.priceVnd, item.compareAtVnd);
  const inStock = item.inventoryQty == null || item.inventoryQty > 0;

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="top-row">
        <button type="button" className="icon-btn" onClick={() => router.back()} aria-label="Back">
          ←
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="icon-btn" aria-label="Yêu thích">
            ♡
          </button>
          <Link href="/cart" className="icon-btn" aria-label="Giỏ hàng">
            🛒
          </Link>
        </div>
      </div>

      <div className={`detail-hero product-cover ${item.coverTone || "violet"}`}>
        {coverEmoji(item.type)}
      </div>

      <div className="detail-pad">
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>{item.title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {item.summary || item.seller.displayName}
        </p>
        <div className="rating" style={{ marginTop: 8 }}>
          <span className="star">★</span> {item.ratingAvg.toFixed(1)} ({item.ratingCount} đánh giá)
        </div>

        <div className="price-row" style={{ marginTop: 12 }}>
          <span className="price" style={{ fontSize: 22 }}>
            <Money vnd={item.priceVnd} />
          </span>
          {item.compareAtVnd != null && item.compareAtVnd > item.priceVnd && (
            <span className="price-old">
              <Money vnd={item.compareAtVnd} />
            </span>
          )}
          {pct != null && <span className="discount-pill">-{pct}%</span>}
        </div>

        <div className="tag-row">
          {item.serviceMeta && <span className="tag">📦 {item.serviceMeta}</span>}
          <span className="tag">{inStock ? "✅ Còn hàng" : "⛔ Hết hàng"}</span>
          {item.deliveryMeta && <span className="tag">🚚 {item.deliveryMeta}</span>}
        </div>

        <h2 style={{ fontSize: 16, margin: "8px 0" }}>Mô tả sản phẩm</h2>
        <p style={{ margin: 0, color: "var(--pfc-muted)", lineHeight: 1.5 }}>{item.description}</p>

        {error && <div className="error-banner">{error}</div>}
      </div>

      <div className="sticky-actions">
        <button className="btn-outline" disabled={busy} onClick={() => addCart(false)}>
          Thêm vào giỏ
        </button>
        <button className="btn-primary" disabled={busy} onClick={() => addCart(true)}>
          Mua ngay
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
