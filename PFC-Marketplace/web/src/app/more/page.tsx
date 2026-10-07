"use client";

import Link from "next/link";
import { BottomNav, StatusBar } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/domain/permissions";

export default function MorePage() {
  const { user, loading, can } = useAuth();

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="page-pad">
        <h1 className="page-title">More</h1>
        {loading ? (
          <p className="muted">Đang tải phiên…</p>
        ) : user ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <strong>{user.name}</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {user.email} · {ROLE_LABELS[user.role]}
            </p>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>
              {user.permissions.length} quyền đang hiệu lực
            </p>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              Chưa đăng nhập — một số mục sẽ bị ẩn theo phân quyền.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/orders" className="card">
            Đơn hàng
          </Link>

          {can("listing.create") && (
            <Link
              href="/seller/new"
              className="card"
              style={{
                background: "var(--pfc-primary-soft)",
                borderColor: "var(--pfc-primary)",
                color: "var(--pfc-primary)",
                fontWeight: 750,
              }}
            >
              + Thêm sản phẩm
            </Link>
          )}

          {can("seller.console") && (
            <Link href="/seller" className="card">
              Seller Center
            </Link>
          )}

          {can("admin.queue") && (
            <Link href="/admin" className="card">
              Admin duyệt listing
            </Link>
          )}

          {can("admin.roles") && (
            <Link
              href="/permissions"
              className="card"
              style={{
                background: "var(--pfc-primary-soft)",
                borderColor: "var(--pfc-primary)",
                color: "var(--pfc-primary)",
                fontWeight: 750,
              }}
            >
              Phân quyền
            </Link>
          )}

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
