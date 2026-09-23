"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

export default function ManageTeamsPage() {
  const { data, error, post, loading } = useClubData();
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner =
    data?.myMembership?.position === "owner" || !!data?.user?.isSuperAdmin;

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) {
      setToast("Bạn không có quyền thực hiện thao tác này.");
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      if (editId) {
        await post({
          action: "update_team",
          teamId: editId,
          name: teamName,
          description: teamDesc,
        });
        setToast("Cập nhật ban thành công.");
      } else {
        await post({
          action: "create_team",
          name: teamName,
          description: teamDesc,
        });
        setToast("Đã tạo ban mới.");
      }
      setTeamName("");
      setTeamDesc("");
      setEditId(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function removeTeam(id: string, name: string) {
    if (!isOwner) {
      setToast("Bạn không có quyền thực hiện thao tác này.");
      return;
    }
    if (!confirm(`Xóa ban «${name}»? Thành viên sẽ về «Chưa gán ban».`)) return;
    setBusy(true);
    try {
      await post({ action: "delete_team", teamId: id });
      setToast("Đã xóa ban.");
      if (editId === id) {
        setEditId(null);
        setTeamName("");
        setTeamDesc("");
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader title="Quản lý Ban / Team" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <section className="section">
        <p className="muted" style={{ marginTop: 0 }}>
          Tên ban không trùng (không phân biệt hoa/thường). Chỉ Chủ nhiệm được
          tạo / sửa / xóa.
        </p>

        {loading && !data ? (
          <p className="muted">Đang tải…</p>
        ) : (data?.teams?.length ?? 0) === 0 ? (
          <p className="muted">Chưa có ban.</p>
        ) : (
          <div className="menu-list">
            {data!.teams.map((t) => {
              const count =
                "memberCount" in t && typeof t.memberCount === "number"
                  ? t.memberCount
                  : (data?.members.filter(
                      (m) => m.teamId === t.id && m.status === "active",
                    ).length ?? 0);
              return (
                <div key={t.id} className="menu-item" style={{ display: "block" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "baseline",
                    }}
                  >
                    <strong>{t.name}</strong>
                    <span className="badge">{count} TV</span>
                  </div>
                  {t.description ? (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {t.description}
                    </div>
                  ) : null}
                  {isOwner && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={busy}
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
                        disabled={busy}
                        onClick={() => void removeTeam(t.id, t.name)}
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

        {isOwner ? (
          <form onSubmit={saveTeam} className="card" style={{ marginTop: 14 }}>
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
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>
            Bạn chỉ xem danh sách ban (không có quyền tạo/xóa).
          </p>
        )}

        <Link href="/manage" className="btn-ghost" style={{ marginTop: 16, display: "block" }}>
          ← Quay lại Quản lý
        </Link>
      </section>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 88,
            zIndex: 40,
            background: "#1e1633",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
