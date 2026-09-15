"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("buyer@pfc.vn");
  const [password, setPassword] = useState("Buyer-PFC-2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace("/");
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Đăng nhập thất bại");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mkt-section" style={{ paddingTop: 40 }}>
      <p className="mkt-brand" style={{ color: "var(--mkt-accent)" }}>
        PFC Marketplace
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          margin: "10px 0 8px",
        }}
      >
        Chào mừng trở lại
      </h1>
      <p style={{ color: "var(--mkt-muted)", marginBottom: 20 }}>
        Đăng nhập để mua, bán và theo dõi đơn hàng trong Digital Hub.
      </p>
      <form onSubmit={onSubmit} className="mkt-card">
        {error && <div className="mkt-error">{error}</div>}
        <label className="mkt-label">
          Email
          <input className="mkt-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mkt-label">
          Mật khẩu
          <input
            className="mkt-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="mkt-btn" disabled={loading}>
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--mkt-muted)" }}>
        Demo: buyer@pfc.vn / seller@pfc.vn / admin@pfc.vn
        <br />
        Mật khẩu: Buyer-PFC-2026 · Seller-PFC-2026 · Admin-PFC-2026
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/" style={{ color: "var(--mkt-accent)" }}>
          Xem catalog (cần đăng nhập để mua)
        </Link>
      </p>
    </main>
  );
}
