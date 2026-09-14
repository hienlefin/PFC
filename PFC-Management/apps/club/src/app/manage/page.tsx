"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader, PfcLogo } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

export default function ManagePage() {
  const router = useRouter();
  const { data, error } = useClubData();
  const report = data?.report;

  async function signOut() {
    await fetch("/api/club", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <AppHeader title="Quản lý câu lạc bộ" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <section className="section">
        <div
          className="card"
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          <Link href="/" aria-label="Về trang chủ">
            <PfcLogo size={48} />
          </Link>
          <div>
            <div style={{ fontWeight: 750 }}>{data?.club.name ?? "PFC"}</div>
            <div className="muted">
              {data?.club.visibility === "private" ? "Riêng tư" : "Công khai"} ·{" "}
              {report?.members.active ?? 0} thành viên
            </div>
          </div>
        </div>

        <div className="chips" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <a href="#thong-ke" className="chip active">
            Tổng quan
          </a>
          <Link href="/members" className="chip">
            Thành viên
          </Link>
          <Link href="/events" className="chip">
            Sự kiện
          </Link>
          <Link href="/tasks" className="chip">
            Công việc
          </Link>
        </div>

        {report && (
          <div className="stat-grid" style={{ marginBottom: 14 }} id="thong-ke">
            <Link href="/members" className="stat-card">
              <div className="label">Thành viên</div>
              <div className="value">{report.members.total}</div>
            </Link>
            <Link href="/tasks" className="stat-card">
              <div className="label">Công việc</div>
              <div className="value">{report.tasks.total}</div>
            </Link>
            <Link href="/events#hoat-dong" className="stat-card">
              <div className="label">Hoạt động</div>
              <div className="value">{report.activities}</div>
            </Link>
            <a href="#tai-lieu" className="stat-card">
              <div className="label">Tài liệu</div>
              <div className="value">{report.documents}</div>
            </a>
          </div>
        )}

        <div className="menu-list">
          <Link href="/members" className="menu-item">
            <span className="icon">✅</span> Duyệt thành viên
            {!!report?.members.pending && (
              <span className="badge warn" style={{ marginLeft: "auto" }}>
                {report.members.pending}
              </span>
            )}
          </Link>
          <Link href="/tasks" className="menu-item">
            <span className="icon">🗂️</span> Quản lý công việc
          </Link>
          <a href="#tai-lieu" className="menu-item">
            <span className="icon">📄</span> Tài liệu nội bộ
            <span className="muted" style={{ marginLeft: "auto" }}>
              {report?.documents ?? 0}
            </span>
          </a>
          <a href="#thong-bao" className="menu-item">
            <span className="icon">🔔</span> Thông báo CLB
          </a>
          <a href="#thong-ke" className="menu-item">
            <span className="icon">📈</span> Thống kê hoạt động
          </a>
          <button
            type="button"
            className="menu-item"
            onClick={() => void signOut()}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "var(--pfc-danger)",
            }}
          >
            <span className="icon">🚪</span> Đăng xuất
          </button>
        </div>

        <div id="thong-bao" className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Thông báo CLB</div>
          <p className="muted" style={{ margin: 0 }}>
            Chuông trên header dẫn tới đây. Kênh notify đầy đủ thuộc CM-601.
          </p>
        </div>

        <DocumentsList documents={data?.documents ?? []} />

        <button
          type="button"
          className="btn-primary solid"
          style={{ marginTop: 16, background: "var(--pfc-danger)" }}
          onClick={() => void signOut()}
        >
          Đăng xuất
        </button>
      </section>
    </>
  );
}

function DocumentsList({
  documents,
}: {
  documents: { id: string; title: string }[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div id="tai-lieu">
      {documents.map((d) => (
        <button
          type="button"
          key={d.id}
          className="list-row list-row-btn"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => setOpenId(openId === d.id ? null : d.id)}
        >
          <div className="avatar">📎</div>
          <div style={{ fontWeight: 600, fontSize: 13, textAlign: "left" }}>
            {d.title}
            {openId === d.id && (
              <div className="muted" style={{ marginTop: 4, fontWeight: 500 }}>
                Tài liệu nội bộ CLB — xem/xóa đầy đủ thuộc CM-500.
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
