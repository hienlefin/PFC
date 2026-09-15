"use client";

import Link from "next/link";
import { BottomNav, StatusBar, PfcLogo } from "@/components/ui";

export default function HubHomePage() {
  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="top-row">
        <PfcLogo />
        <Link href="/login" className="icon-btn">
          👤
        </Link>
      </div>
      <div className="page-pad">
        <h1 className="page-title">PFC Digital Hub</h1>
        <p className="page-sub">Chọn module để tiếp tục hành trình của bạn.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/" className="card" style={{ display: "block" }}>
            <strong>Marketplace</strong>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Sản phẩm, khóa học, dịch vụ
            </p>
          </Link>
          <Link href="/orders" className="card" style={{ display: "block" }}>
            <strong>Đơn hàng của tôi</strong>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Theo dõi thanh toán & giao nhận
            </p>
          </Link>
          <Link href="/seller" className="card" style={{ display: "block" }}>
            <strong>Seller Center</strong>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Đăng bán & quản lý đơn
            </p>
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
