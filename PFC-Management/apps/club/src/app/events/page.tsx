"use client";

import Link from "next/link";
import { AppHeader, StatusBar } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

export default function EventsPage() {
  const { data, error } = useClubData();
  const links = data?.links ?? [];
  const activities = data?.activities ?? [];

  return (
    <>
      <StatusBar />
      <AppHeader title="Sự kiện" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <div className="chips">
        <span className="chip active">Sắp tới</span>
        <span className="chip">Online</span>
        <span className="chip">Offline</span>
      </div>

      <section className="section">
        <div className="section-title">
          <h3>Sự kiện đã liên kết</h3>
        </div>
        <p className="muted" style={{ marginBottom: 10 }}>
          Event thuộc Shared Event Engine — CLB chỉ liên kết (FR-CLB-010)
        </p>
        {links.map((l) => (
          <div key={l.id} className="card">
            <div
              style={{
                height: 120,
                borderRadius: 12,
                background: "linear-gradient(135deg,#ebe6f6,#9281c7)",
                marginBottom: 10,
              }}
            />
            <div style={{ fontWeight: 750, fontSize: 15 }}>
              {l.label ?? "Sự kiện PFC"}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              ID: {l.externalEventId}
            </div>
            <button className="btn-primary solid" style={{ marginTop: 12 }}>
              Xem chi tiết
            </button>
          </div>
        ))}
        {!links.length && <p className="muted">Chưa có sự kiện liên kết.</p>}
      </section>

      <section className="section">
        <div className="section-title">
          <h3>Hoạt động nội bộ</h3>
        </div>
        {activities.map((a) => (
          <div key={a.id} className="list-row">
            <div className="avatar">🎯</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
              <div className="muted">{a.status}</div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
