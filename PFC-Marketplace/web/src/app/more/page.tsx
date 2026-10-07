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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <strong>{user.name}</strong>
              <span className="role-pill">{user.role}</span>
            </div>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {user.email}
            </p>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>
              {ROLE_LABELS[user.role]} · {user.permissions.length} quyền
            </p>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              Chưa đăng nhập. Menu Thêm sản phẩm / Phân quyền chỉ hiện khi đủ quyền.
            </p>
            <Link href="/login" className="btn-primary" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
              Đăng nhập
            </Link>
          </div>
        )}

        <div className="section-head">
          <h2>Tài khoản</h2>
        </div>
        <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
          <Link href="/orders" className="card">
            Đơn hàng của tôi
          </Link>
          <Link href="/cart" className="card">
            Giỏ hàng
          </Link>
        </div>

        {(can("listing.create") || can("seller.console") || can("admin.queue") || can("admin.roles")) && (
          <>
            <div className="section-head">
              <h2>Không gian làm việc</h2>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
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
                  Seller Center — sản phẩm & đơn bán
                </Link>
              )}
              {can("admin.queue") && (
                <Link href="/admin" className="card">
                  Admin — duyệt listing
                </Link>
              )}
              {can("admin.roles") && (
                <Link
                  href="/permissions"
                  className="card"
                  style={{
                    background: "var(--pfc-primary)",
                    borderColor: "var(--pfc-primary)",
                    color: "#fff",
                    fontWeight: 750,
                  }}
                >
                  Phân quyền — đổi role Buyer/Seller/Admin
                </Link>
              )}
            </div>
          </>
        )}

        <div className="section-head">
          <h2>Hệ thống</h2>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
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
