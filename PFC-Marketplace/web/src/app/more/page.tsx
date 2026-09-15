"use client";

import Link from "next/link";
import { BottomNav, StatusBar } from "@/components/ui";

export default function MorePage() {
  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="page-pad">
        <h1 className="page-title">More</h1>
        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/orders" className="card">
            Đơn hàng
          </Link>
          <Link href="/seller" className="card">
            Seller Center
          </Link>
          <Link href="/admin" className="card">
            Admin duyệt listing
          </Link>
          <Link href="/login" className="card">
            Đăng nhập / đổi tài khoản
          </Link>
          <button
            type="button"
            className="card"
            style={{ textAlign: "left", border: "1px solid var(--pfc-border)", background: "#fff", cursor: "pointer" }}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
