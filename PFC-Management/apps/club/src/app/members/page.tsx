"use client";

import Link from "next/link";
import { AppHeader, StatusBar } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

const POSITION_LABEL: Record<string, string> = {
  owner: "Chủ nhiệm",
  leader: "Ban điều hành",
  ban_chuyen_mon: "Ban Chuyên môn",
  ban_truyen_thong: "Ban Truyền thông",
  ban_su_kien: "Ban Sự kiện",
  member: "Thành viên",
};

export default function MembersPage() {
  const { data, error, post } = useClubData();
  const members = data?.members ?? [];

  return (
    <>
      <StatusBar />
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
        <span className="chip active">Tất cả ({members.length})</span>
        <span className="chip">
          Đang hoạt động ({members.filter((m) => m.status === "active").length})
        </span>
        <span className="chip">
          Chờ duyệt ({members.filter((m) => m.status === "pending").length})
        </span>
      </div>

      <section className="section">
        {members.map((m) => (
          <div key={m.id} className="list-row">
            <div className="avatar">
              {(m.fullName ?? m.email ?? "?")
                .split(" ")
                .slice(-2)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {m.fullName ?? m.email ?? m.memberId}
              </div>
              <div className="muted">
                {POSITION_LABEL[m.position] ?? m.position}
              </div>
            </div>
            <span className={`badge${m.status === "pending" ? " warn" : " ok"}`}>
              {m.status === "pending"
                ? "Chờ duyệt"
                : m.status === "active"
                  ? "Hoạt động"
                  : m.status}
            </span>
            {m.status === "pending" && (
              <button
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
        {!members.length && <p className="muted">Chưa có thành viên.</p>}
      </section>
    </>
  );
}
