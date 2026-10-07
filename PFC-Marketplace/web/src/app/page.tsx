"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BottomNav,
  Money,
  PfcLogo,
  RoleBanner,
  StatusBar,
  coverEmoji,
  discountPct,
} from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";

type Listing = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  priceVnd: number;
  compareAtVnd?: number | null;
  ratingAvg?: number;
  ratingCount?: number;
  coverTone?: string;
  sellerName: string;
};

const CATS = [
  { key: "", label: "Tất cả", icon: "✨" },
  { key: "COURSE", label: "Khóa học", icon: "🎓" },
  { key: "PHYSICAL", label: "Sách", icon: "📚" },
  { key: "SERVICE", label: "Dịch vụ", icon: "🛠️" },
  { key: "EVENT_TICKET", label: "Sự kiện", icon: "📅" },
] as const;

export default function MarketplaceHomePage() {
  const { can } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = type ? `?type=${type}` : "";
    fetch(`/api/listings${params}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [type]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(needle) ||
        (i.summary || "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="top-row">
        <PfcLogo />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {can("listing.create") && (
            <Link
              href="/seller/new"
              className="icon-btn"
              aria-label="Thêm sản phẩm"
              title="Thêm sản phẩm"
              style={{
                width: "auto",
                padding: "0 12px",
                borderRadius: 999,
                background: "var(--pfc-primary-soft)",
                color: "var(--pfc-primary)",
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              + Thêm
            </Link>
          )}
          {can("admin.roles") && (
            <Link
              href="/permissions"
              className="icon-btn"
              aria-label="Phân quyền"
              title="Phân quyền"
              style={{
                width: "auto",
                padding: "0 12px",
                borderRadius: 999,
                background: "var(--pfc-primary)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              Quyền
            </Link>
          )}
          <button type="button" className="icon-btn" aria-label="Thông báo">
            🔔
          </button>
        </div>
      </div>

      <RoleBanner />

      <div className="page-pad">
        <h1 className="page-title">Marketplace</h1>
        <p className="page-sub">
          Sản phẩm &amp; dịch vụ chất lượng cho hành trình phát triển của bạn
        </p>

        <label className="search-bar">
          <span aria-hidden>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm sản phẩm, dịch vụ, khóa học..."
          />
        </label>

        <div className="cat-row">
          {CATS.map((c) => (
            <button
              key={c.key || "all"}
              type="button"
              className={`cat-item${type === c.key ? " active" : ""}`}
              onClick={() => setType(c.key)}
            >
              <span className="bubble">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <div className="section-head">
          <h2>Sản phẩm nổi bật</h2>
          <a href="#grid">Xem tất cả</a>
        </div>

        {loading ? (
          <p className="muted">Đang tải…</p>
        ) : (
          <div className="product-grid" id="grid">
            {filtered.map((item) => {
              const pct = discountPct(item.priceVnd, item.compareAtVnd);
              return (
                <Link key={item.id} href={`/listings/${item.id}`} className="product-card">
                  <div className={`product-cover ${item.coverTone || "violet"}`}>
                    {coverEmoji(item.type)}
                  </div>
                  <div className="product-body">
                    <h3>{item.title}</h3>
                    <div className="price">
                      <Money vnd={item.priceVnd} />
                    </div>
                    {pct != null && (
                      <div className="price-row">
                        <span className="price-old">
                          <Money vnd={item.compareAtVnd!} />
                        </span>
                        <span className="discount-pill">-{pct}%</span>
                      </div>
                    )}
                    <div className="rating">
                      <span className="star">★</span> {(item.ratingAvg ?? 0).toFixed(1)} (
                      {item.ratingCount ?? 0})
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
