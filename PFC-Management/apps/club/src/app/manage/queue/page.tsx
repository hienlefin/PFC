"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

const PAGE_SIZE = 10;

/** Club-scoped approval queue — NOT cross-hub CMS-SYS (ADR-008). */
export default function ApprovalQueuePage() {
  const { data, error, post, can } = useClubData();
  const queue = data?.approvalQueue;
  const pending = queue?.memberships ?? [];
  const reviews = queue?.taskReviews ?? [];
  const teams = data?.teams ?? [];

  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const teamLabel =
      teamFilter !== "all" && teamFilter !== "none"
        ? teams.find((t) => t.id === teamFilter)?.name
        : null;
    return pending.filter((m) => {
      if (teamFilter === "none" && m.teamId) return false;
      if (teamFilter !== "all" && teamFilter !== "none") {
        const nv1 = m.teamId === teamFilter;
        const nv2 =
          !!teamLabel &&
          !!m.joinReason &&
          m.joinReason.includes(`NV2=${teamLabel}`);
        if (!nv1 && !nv2) return false;
      }
      const created = m.createdAt ? new Date(m.createdAt).getTime() : 0;
      if (dateFrom) {
        const from = new Date(dateFrom).setHours(0, 0, 0, 0);
        if (created && created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).setHours(23, 59, 59, 999);
        if (created && created > to) return false;
      }
      return true;
    });
  }, [pending, teamFilter, dateFrom, dateTo, teams]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const teamName = (id?: string | null) =>
    teams.find((t) => t.id === id)?.name ?? "Chưa chọn ban";

  return (
    <>
      <AppHeader title="Hàng chờ duyệt" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <section className="section">
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Phạm vi Club</div>
          <p className="muted" style={{ marginBottom: 0, marginTop: 6 }}>
            {queue?.note ??
              "CMS-SYS duyệt bài/học/tài chính từ Hub khác thuộc Platform Core — không nằm trong Club."}
          </p>
        </div>

        <div className="section-title">
          <h3>
            Thành viên chờ duyệt ({filtered.length}/{pending.length})
          </h3>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 650, marginBottom: 8 }}>Lọc nâng cao</div>
          <label className="field">
            Ban nguyện vọng 1 / 2
            <select
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setPage(0);
              }}
              style={{
                width: "100%",
                marginTop: 6,
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--pfc-border)",
                font: "inherit",
              }}
            >
              <option value="all">Tất cả ban</option>
              <option value="none">Chưa chọn NV1</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (NV1 hoặc NV2)
                </option>
              ))}
            </select>
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 10,
            }}
          >
            <label className="field">
              Từ ngày
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              />
            </label>
            <label className="field">
              Đến ngày
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              />
            </label>
          </div>
        </div>

        {!can("approve_memberships") && (
          <p className="muted">Bạn không có quyền duyệt thành viên.</p>
        )}
        {pageRows.map((m) => (
          <div key={m.id} className="list-row">
            <div className="avatar">
              {(m.fullName ?? "?")
                .split(" ")
                .slice(-2)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{m.fullName ?? m.email}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {m.email}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                NV1: {teamName(m.teamId)}
                {m.joinReason?.match(/NV2=([^|]+)/)?.[1]
                  ? ` · NV2: ${m.joinReason.match(/NV2=([^|]+)/)?.[1]?.trim()}`
                  : ""}
                {m.createdAt
                  ? ` · Nộp: ${new Date(m.createdAt).toLocaleDateString("vi-VN")}`
                  : ""}
              </div>
              {m.joinReason ? (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Lý do: {m.joinReason.replace(/\s*\|\s*NV2=[^|]+/, "")}
                </div>
              ) : null}
            </div>
            {can("approve_memberships") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    void post({
                      action: "membership_transition",
                      membershipId: m.id,
                      to: "active",
                    })
                  }
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    const note = prompt("Lý do từ chối (≥ 8 ký tự)") ?? "";
                    void post({
                      action: "membership_transition",
                      membershipId: m.id,
                      to: "rejected",
                      note,
                    });
                  }}
                >
                  Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="muted">Không có yêu cầu khớp bộ lọc.</p>}

        {filtered.length > PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Trước
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              Trang {safePage + 1}/{pageCount}
            </span>
            <button
              type="button"
              className="btn-ghost"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Sau →
            </button>
          </div>
        )}

        <div className="section-title" style={{ marginTop: 18 }}>
          <h3>Công việc chờ review ({reviews.length})</h3>
        </div>
        {reviews.map((t) => (
          <Link key={t.id} href="/tasks" className="list-row">
            <div className="avatar">✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{t.title}</div>
              <div className="muted">
                {t.status} · {t.priority}
              </div>
            </div>
          </Link>
        ))}
        {!reviews.length && <p className="muted">Không có task ở review.</p>}

        <Link href="/manage" className="btn-ghost" style={{ marginTop: 16 }}>
          ← Quản lý
        </Link>
      </section>
    </>
  );
}
