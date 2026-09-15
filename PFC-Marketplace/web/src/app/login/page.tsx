"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PfcLogo, StatusBar } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("buyer@pfc.vn");
  const [password, setPassword] = useState("Buyer-PFC-2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="phone-scroll no-nav">
      <StatusBar />
      <div className="page-pad" style={{ paddingTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PfcLogo size={72} />
        </div>
        <h1 className="page-title" style={{ textAlign: "center" }}>
          Chào mừng trở lại!
        </h1>
        <p className="page-sub" style={{ textAlign: "center" }}>
          Đăng nhập vào Personal Finance Club Marketplace
        </p>
        <form className="card" onSubmit={onSubmit}>
          {error && <div className="error-banner">{error}</div>}
          <label className="field">
            Email hoặc số điện thoại
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <p className="muted" style={{ textAlign: "center", marginTop: 14 }}>
          Demo: buyer@pfc.vn / seller@pfc.vn / admin@pfc.vn
          <br />
          Buyer-PFC-2026 · Seller-PFC-2026 · Admin-PFC-2026
        </p>
        <p style={{ textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--pfc-primary)", fontWeight: 650 }}>
            Xem Marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}
