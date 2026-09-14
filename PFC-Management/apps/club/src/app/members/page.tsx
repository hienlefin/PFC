"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

const POSITION_LABEL: Record<string, string> = {
  owner: "Chủ nhiệm",
  leader: "Ban điều hành",
  ban_chuyen_mon: "Ban Chuyên môn",
  ban_truyen_thong: "Ban Truyền thông",
  ban_su_kien: "Ban Sự kiện",
  member: "Thành viên",
};

type Filter = "all" | "active" | "pending";

export default function MembersPage() {
  const { data, error, post } = useClubData();
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const members = data?.members ?? [];
  const shown = useMemo(() => {
    if (filter === "all") return members;
    return members.filter((m) => m.status === filter);
  }, [members, filter]);

  return (
    <>
      <AppHeader title="Thành viên" />
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
          className={`chip${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tất cả ({members.length})
        </button>
        <button
          type="button"
          className={`chip${filter === "active" ? " active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Đang hoạt động ({members.filter((m) => m.status === "active").length})
        </button>
        <button
          type="button"
          className={`chip${filter === "pending" ? " active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Chờ duyệt ({members.filter((m) => m.status === "pending").length})
        </button>
      </div>

      <section className="section">
        {shown.map((m) => (
          <div key={m.id} className="list-row">
            <button
              type="button"
              className="list-row-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                padding: 0,
              }}
              onClick={() => setOpenId(openId === m.id ? null : m.id)}
            >
              <div className="avatar">
                {(m.fullName ?? m.email ?? "?")
                  .split(" ")
                  .slice(-2)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {m.fullName ?? m.email ?? m.memberId}
                </div>
                <div className="muted">
                  {POSITION_LABEL[m.position] ?? m.position}
                </div>
                {openId === m.id && (
                  <div className="muted" style={{ marginTop: 6 }}>
                    {m.email ?? m.memberId}
                  </div>
                )}
              </div>
              <span className={`badge${m.status === "pending" ? " warn" : " ok"}`}>
                {m.status === "pending"
                  ? "Chờ duyệt"
                  : m.status === "active"
                    ? "Hoạt động"
                    : m.status}
              </span>
            </button>
            {m.status === "pending" && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  post({
                    action: "membership_transition",
                    membershipId: m.id,
                    to: "active",
                  })
                }
              >
                Duyệt
              </button>
            )}
          </div>
        ))}
        {!shown.length && <p className="muted">Chưa có thành viên.</p>}
      </section>
    </>
  );
}
