"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

type Chip = "upcoming" | "online" | "offline";

export default function EventsPage() {
  const { data, error } = useClubData();
  const [chip, setChip] = useState<Chip>("upcoming");
  const [openLink, setOpenLink] = useState<string | null>(null);
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const links = data?.links ?? [];
  const activities = data?.activities ?? [];
  const visibleLinks = chip === "upcoming" ? links : [];

  return (
    <>
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
        <button
          type="button"
          className={`chip${chip === "upcoming" ? " active" : ""}`}
          onClick={() => setChip("upcoming")}
        >
          Sắp tới
        </button>
        <button
          type="button"
          className={`chip${chip === "online" ? " active" : ""}`}
          onClick={() => setChip("online")}
        >
          Online
        </button>
        <button
          type="button"
          className={`chip${chip === "offline" ? " active" : ""}`}
          onClick={() => setChip("offline")}
        >
          Offline
        </button>
      </div>

      <section className="section">
        <div className="section-title">
          <h3>Sự kiện đã liên kết</h3>
        </div>
        <p className="muted" style={{ marginBottom: 10 }}>
          Event thuộc Shared Event Engine — CLB chỉ liên kết (FR-CLB-010)
        </p>
        {visibleLinks.map((l) => (
          <div key={l.id} className="card">
            <button
              type="button"
              className="figure-btn"
              aria-label={l.label ?? "Sự kiện PFC"}
              onClick={() => setOpenLink(openLink === l.id ? null : l.id)}
            />
            <div style={{ fontWeight: 750, fontSize: 15 }}>
              {l.label ?? "Sự kiện PFC"}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              ID: {l.externalEventId}
            </div>
            <button
              type="button"
              className="btn-primary solid"
              style={{ marginTop: 12 }}
              onClick={() => setOpenLink(openLink === l.id ? null : l.id)}
            >
              {openLink === l.id ? "Thu gọn" : "Xem chi tiết"}
            </button>
            {openLink === l.id && (
              <p className="muted" style={{ marginTop: 10 }}>
                Đăng ký / vé do Shared Event Engine xử lý. Mã liên kết:{" "}
                {l.externalEventId}
              </p>
            )}
          </div>
        ))}
        {!visibleLinks.length && (
          <p className="muted">
            {chip === "upcoming"
              ? "Chưa có sự kiện liên kết."
              : "Chưa có sự kiện cho bộ lọc này (CLB chỉ lưu mã liên kết)."}
          </p>
        )}
      </section>

      <section className="section" id="hoat-dong">
        <div className="section-title">
          <h3>Hoạt động nội bộ</h3>
        </div>
        {activities.map((a) => (
          <button
            type="button"
            key={a.id}
            className="list-row list-row-btn"
            onClick={() => setOpenActivity(openActivity === a.id ? null : a.id)}
          >
            <div className="avatar">🎯</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
              <div className="muted">{a.status}</div>
              {openActivity === a.id && (
                <div className="muted" style={{ marginTop: 6 }}>
                  Hoạt động nội bộ CLB (không phải Event).
                </div>
              )}
            </div>
          </button>
        ))}
      </section>
    </>
  );
}
