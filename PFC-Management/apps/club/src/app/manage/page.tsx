"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader, PfcLogo } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

export default function ManagePage() {
  const router = useRouter();
  const { data, error, post } = useClubData();
  const report = data?.report;
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isOwner =
    data?.myMembership?.position === "owner" || !!data?.user?.isSuperAdmin;

  async function signOut() {
    await fetch("/api/club", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (editId) {
        await post({
          action: "update_team",
          teamId: editId,
          name: teamName,
          description: teamDesc,
        });
        setMsg("Đã cập nhật ban.");
      } else {
        await post({
          action: "create_team",
          name: teamName,
          description: teamDesc,
        });
        setMsg("Đã tạo ban mới.");
      }
      setTeamName("");
      setTeamDesc("");
      setEditId(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
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
          <Link href="/manage/teams" className="chip">
            Ban / Team
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
          <Link href="/manage/queue" className="menu-item">
            <span className="icon">📥</span> Hàng chờ duyệt
            {!!report?.members.pending && (
              <span className="badge warn" style={{ marginLeft: "auto" }}>
                {report.members.pending}
              </span>
            )}
          </Link>
          <Link href="/members" className="menu-item">
            <span className="icon">✅</span> Duyệt / Mời thành viên
            {!!report?.members.pending && (
              <span className="badge warn" style={{ marginLeft: "auto" }}>
                {report.members.pending}
              </span>
            )}
          </Link>
          <Link href="/manage/teams" className="menu-item">
            <span className="icon">🏷️</span> Ban / Team
          </Link>
          <Link href="/tasks" className="menu-item">
            <span className="icon">🗂️</span> Quản lý công việc
          </Link>
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

        <div id="ban" className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Ban trong CLB</div>
          {(data?.teams?.length ?? 0) === 0 ? (
            <p className="muted">Chưa có ban.</p>
          ) : (
            <div className="stat-grid">
              {data!.teams.map((t) => {
                const count =
                  data?.members.filter((m) => m.teamId === t.id).length ?? 0;
                return (
                  <div key={t.id} className="stat-card" style={{ textAlign: "left" }}>
                    <div className="label">{t.name}</div>
                    <div className="value" style={{ fontSize: 16 }}>
                      {count} TV
                    </div>
                    {t.description ? (
                      <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
                        {t.description}
                      </div>
                    ) : null}
                    {isOwner && (
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setEditId(t.id);
                            setTeamName(t.name);
                            setTeamDesc(t.description ?? "");
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            if (!confirm(`Xóa ban ${t.name}?`)) return;
                            void post({ action: "delete_team", teamId: t.id }).catch(
                              (err) =>
                                setMsg(
                                  err instanceof Error ? err.message : "Lỗi",
                                ),
                            );
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isOwner && (
            <form onSubmit={saveTeam} style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 650, marginBottom: 8 }}>
                {editId ? "Sửa ban" : "Tạo ban mới"}
              </div>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Tên ban (vd: Ban Truyền thông)"
                required
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                  marginBottom: 8,
                }}
              />
              <input
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                placeholder="Mô tả ngắn"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn-primary solid" disabled={busy}>
                  {editId ? "Lưu" : "Tạo ban"}
                </button>
                {editId && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditId(null);
                      setTeamName("");
                      setTeamDesc("");
                    }}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}
          <Link
            href="/manage/teams"
            className="btn-ghost"
            style={{ marginTop: 10, display: "inline-block" }}
          >
            Mở trang Quản lý Ban →
          </Link>
          {msg && (
            <p className="muted" style={{ marginTop: 8 }}>
              {msg}
            </p>
          )}
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
