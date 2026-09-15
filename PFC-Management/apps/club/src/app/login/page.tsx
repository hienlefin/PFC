"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/MobileChrome";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("leader@pfc.vn");
  const [password, setPassword] = useState("PFC123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await fetch("/api/club?action=bootstrap");
    const res = await fetch("/api/club", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.ok) {
      setError(data.error?.message ?? "Đăng nhập thất bại");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <StatusBar />
      <div style={{ padding: "28px 20px" }}>
        <Link href="/" aria-label="Về trang chủ">
          <Image
            src="/pfc-logo.png"
            alt="Personal Finance Club"
            width={140}
            height={140}
            className="logo-hero"
            priority
          />
        </Link>
        <h1
          style={{
            margin: "18px 0 6px",
            fontSize: 24,
            textAlign: "center",
            color: "var(--pfc-text)",
          }}
        >
          Chào mừng trở lại!
        </h1>
        <p className="muted" style={{ marginBottom: 22, textAlign: "center" }}>
          Đăng nhập vào Personal Finance Club
        </p>

        <form onSubmit={onSubmit}>
          <label className="field">
            Email hoặc số điện thoại
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="leader@pfc.vn"
            />
          </label>
          <label className="field">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn-primary solid" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          Demo: leader@pfc.vn / member@pfc.vn — PFC123!
        </p>
      </div>
    </>
  );
}
