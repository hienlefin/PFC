"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PfcLogo, StatusBar } from "@/components/ui";

const DEMOS = [
  {
    role: "BUYER",
    label: "Buyer — mua hàng",
    email: "buyer@pfc.vn",
    password: "Buyer-PFC-2026",
    next: "/",
  },
  {
    role: "SELLER",
    label: "Seller — thêm sản phẩm",
    email: "seller@pfc.vn",
    password: "Seller-PFC-2026",
    next: "/seller/new",
  },
  {
    role: "CHU_NHIEM",
    label: "Chủ nhiệm CLB — phân quyền",
    email: "chunhiem@pfc.vn",
    password: "ChuNhiem-PFC-2026",
    next: "/permissions",
  },
  {
    role: "TRUONG_CLB",
    label: "Trưởng CLB — phân quyền",
    email: "truong@pfc.vn",
    password: "Truong-PFC-2026",
    next: "/permissions",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("buyer@pfc.vn");
  const [password, setPassword] = useState("Buyer-PFC-2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loginAs(nextEmail: string, nextPassword: string, fallbackPath = "/") {
    setLoading(true);
    setError(null);
    setEmail(nextEmail);
    setPassword(nextPassword);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: nextEmail, password: nextPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Đăng nhập thất bại");
      return;
    }
    const role = data.user?.role as string | undefined;
    const dest = DEMOS.find((d) => d.role === role)?.next || fallbackPath;
    router.push(dest);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginAs(email, password, "/");
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
          Phân quyền chỉ dành cho Chủ nhiệm &amp; Trưởng câu lạc bộ
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

        <p className="muted" style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, color: "var(--pfc-text)" }}>
          Vào nhanh theo vai trò
        </p>
        <div className="demo-accounts">
          {DEMOS.map((d) => (
            <button
              key={d.role}
              type="button"
              className="demo-account-btn"
              disabled={loading}
              onClick={() => loginAs(d.email, d.password, d.next)}
            >
              <span>
                <strong>{d.label}</strong>
                <span>{d.email}</span>
              </span>
              <em>{d.role === "CHU_NHIEM" ? "CN" : d.role === "TRUONG_CLB" ? "Trưởng" : d.role}</em>
            </button>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ color: "var(--pfc-primary)", fontWeight: 650 }}>
            Xem Marketplace không đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
