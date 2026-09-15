"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("phuonglinh@pfc.vn");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại");
        return;
      }
      if (data.role === "PROVIDER") router.push("/provider");
      else if (data.role === "REVIEWER") router.push("/reviewer");
      else router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pb-8 pt-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pfc-purple)]">PFC Digital Hub</p>
      <h1 className="mt-1 text-2xl font-bold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-[var(--pfc-muted)]">Session do server cấp. Không dùng cookie tự đặt.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="w-full rounded-xl border border-[var(--pfc-line)] px-3 py-2.5 text-sm"
        />
        {error && <p className="text-sm text-[var(--pfc-danger)]">{error}</p>}
        <button type="submit" className="pfc-btn" disabled={busy}>
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      <ul className="mt-6 space-y-1 text-xs text-[var(--pfc-muted)]">
        <li>Member: phuonglinh@pfc.vn / Linh-PFC-2026</li>
        <li>Provider: provider@pfc.vn / Provider-PFC-2026</li>
        <li>Reviewer: reviewer@pfc.vn / Reviewer-PFC-2026</li>
      </ul>
    </main>
  );
}
