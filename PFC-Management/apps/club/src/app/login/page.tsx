"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("leader@pfc.vn");
  const [password, setPassword] = useState("PFC123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);

  useEffect(() => {
    const code = search.get("sso_error");
    if (code) setError(`SSO lỗi: ${code}`);
    void fetch("/api/club?action=sso_status")
      .then((r) => r.json())
      .then((d) => setSsoEnabled(!!d.sso?.enabled))
      .catch(() => setSsoEnabled(false));
  }, [search]);

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

  async function onSso() {
    setSsoBusy(true);
    setError(null);
    try {
      await fetch("/api/club?action=bootstrap");
      const res = await fetch("/api/club", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "sso_start",
          email,
          name: "PFC SSO Demo",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.sso?.url) {
        setError(data.error?.message ?? "Không mở được SSO");
        setSsoBusy(false);
        return;
      }
      window.location.href = data.sso.url;
    } catch {
      setError("SSO không khả dụng");
      setSsoBusy(false);
    }
  }

  return (
    <>
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

        {ssoEnabled && (
          <button
            type="button"
            className="btn-primary solid"
            disabled={ssoBusy}
            onClick={() => void onSso()}
            style={{ marginBottom: 14 }}
          >
            {ssoBusy ? "Đang chuyển SSO…" : "Đăng nhập PFC SSO (Platform Core)"}
          </button>
        )}

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
            {loading ? "Đang đăng nhập..." : "Đăng nhập local"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          Demo local: leader@pfc.vn / member@pfc.vn — PFC123!
          {ssoEnabled
            ? " · SSO: bật PLATFORM_SSO_MODE=dev + SHARED_SECRET"
            : " · SSO tắt (Core chưa mở)"}
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải...</p>}>
      <LoginInner />
    </Suspense>
  );
}
