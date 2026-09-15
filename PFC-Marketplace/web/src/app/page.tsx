"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav, Money, typeLabel } from "@/components/ui";

type Listing = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  priceVnd: number;
  sellerName: string;
};

type User = { name: string; role: string } | null;

export default function HomePage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [user, setUser] = useState<User>(null);
  const [type, setType] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = type ? `?type=${type}` : "";
    fetch(`/api/listings${q}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <>
      <header className="mkt-hero">
        <div className="mkt-brand">PFC Marketplace</div>
        <h1>Trao đổi giá trị trong cộng đồng</h1>
        <p>Sản phẩm · Digital · Dịch vụ — thanh toán VND, audit đầy đủ.</p>
        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.95 }}>
          {user ? (
            <span>
              Xin chào {user.name} · {user.role}{" "}
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                style={{
                  marginLeft: 8,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,.5)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "2px 10px",
                  cursor: "pointer",
                }}
              >
                Thoát
              </button>
            </span>
          ) : (
            <Link href="/login" style={{ color: "#fff", textDecoration: "underline" }}>
              Đăng nhập để mua
            </Link>
          )}
        </div>
      </header>

      <section className="mkt-section">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            ["", "Tất cả"],
            ["PHYSICAL", "Vật lý"],
            ["DIGITAL", "Digital"],
            ["SERVICE", "Dịch vụ"],
          ].map(([v, label]) => (
            <button
              key={v || "all"}
              type="button"
              className="mkt-chip"
              style={{
                border: "none",
                cursor: "pointer",
                background: type === v ? "var(--mkt-accent)" : undefined,
                color: type === v ? "#fff" : undefined,
              }}
              onClick={() => setType(v)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--mkt-muted)" }}>Đang tải catalog…</p>
        ) : items.length === 0 ? (
          <div className="mkt-card">Chưa có listing Published.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="mkt-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="mkt-chip">{typeLabel(item.type)}</span>
                  <strong>
                    <Money vnd={item.priceVnd} />
                  </strong>
                </div>
                <h2
                  style={{
                    fontSize: "1.05rem",
                    margin: "10px 0 4px",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {item.title}
                </h2>
                <p style={{ margin: 0, color: "var(--mkt-muted)", fontSize: 14 }}>
                  {item.summary || item.sellerName}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <BottomNav active="home" />
    </>
  );
}
