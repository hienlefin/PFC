"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader, StatusBar, PfcLogo } from "@/components/MobileChrome";
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
      <StatusBar />
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
          <span className="chip active">Tổng quan</span>
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
          <div className="stat-grid" style={{ marginBottom: 14 }}>
            <div className="stat-card">
              <div className="label">Thành viên</div>
              <div className="value">{report.members.total}</div>
            </div>
            <div className="stat-card">
              <div className="label">Công việc</div>
              <div className="value">{report.tasks.total}</div>
            </div>
            <div className="stat-card">
              <div className="label">Hoạt động</div>
              <div className="value">{report.activities}</div>
            </div>
            <div className="stat-card">
              <div className="label">Tài liệu</div>
              <div className="value">{report.documents}</div>
            </div>
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
          <div className="menu-item">
            <span className="icon">📄</span> Tài liệu nội bộ
            <span className="muted" style={{ marginLeft: "auto" }}>
              {report?.documents ?? 0}
            </span>
          </div>
          <div className="menu-item">
            <span className="icon">🔔</span> Thông báo CLB
          </div>
          <div className="menu-item">
            <span className="icon">📈</span> Thống kê hoạt động
          </div>
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

        {(data?.documents ?? []).map((d) => (
          <div key={d.id} className="list-row" style={{ marginTop: 10 }}>
            <div className="avatar">📎</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
          </div>
        ))}

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
