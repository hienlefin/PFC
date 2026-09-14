"use client";

import Link from "next/link";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

export default function HomePage() {
  const { data, error, loading } = useClubData();

  return (
    <>
      <AppHeader showSearch />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <section className="hero-card">
        <h2>
          Cộng đồng mạnh hơn
          <br />
          Khi cùng nhau chia sẻ
        </h2>
        <p>
          {data?.club.name ?? "PFC — Personal Finance Club"} ·{" "}
          {data?.report?.members.active ?? "—"} thành viên
        </p>
        <Link href="/members" className="btn-primary">
          Xem thành viên
        </Link>
      </section>

      <div className="quick-grid">
        {[
          { href: "/tasks", icon: "✅", label: "Công việc" },
          { href: "/members", icon: "👥", label: "Thành viên" },
          { href: "/events", icon: "📅", label: "Sự kiện" },
          { href: "/manage", icon: "📊", label: "Quản lý" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="quick-item">
            <div className="quick-icon">{q.icon}</div>
            {q.label}
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="section-title">
          <h3>Tổng quan CLB</h3>
          <Link href="/manage" className="btn-ghost">
            Chi tiết
          </Link>
        </div>
        {loading && <p className="muted">Đang tải...</p>}
        {data && (
          <div className="stat-grid">
            <Link href="/members" className="stat-card">
              <div className="label">Thành viên</div>
              <div className="value">{data.report?.members.active ?? "—"}</div>
            </Link>
            <Link href="/tasks" className="stat-card">
              <div className="label">Công việc</div>
              <div className="value">{data.report?.tasks.total ?? "—"}</div>
            </Link>
            <Link href="/events#hoat-dong" className="stat-card">
              <div className="label">Hoạt động</div>
              <div className="value">{data.report?.activities ?? "—"}</div>
            </Link>
            <Link href="/events" className="stat-card">
              <div className="label">Sự kiện</div>
              <div className="value">{data.report?.linkedEvents ?? "—"}</div>
            </Link>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title">
          <h3>Giới thiệu</h3>
        </div>
        <div className="card">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {data?.club.description ??
              "Câu lạc bộ tài chính cá nhân dành cho sinh viên."}
          </p>
          <p className="muted" style={{ marginTop: 10 }}>
            {data?.club.visibility === "private" ? "Riêng tư" : "Công khai"} ·{" "}
            {data?.club.status === "active" ? "Đang hoạt động" : data?.club.status}
          </p>
        </div>
      </section>
    </>
  );
}
