"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";
import { QrBlock } from "@/components/QrBlock";

const POSITION_LABEL: Record<string, string> = {
  owner: "Chủ nhiệm",
  leader: "Ban điều hành",
  ban_chuyen_mon: "Trưởng ban CM",
  ban_truyen_thong: "Trưởng ban TT",
  ban_su_kien: "Trưởng ban SK",
  member: "Thành viên",
};

type ViewMode = "list" | "table" | "org";
type PosFilter = "all" | "owner" | "leaders" | "member";

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function posBadgeClass(position: string) {
  if (position === "owner") return "pos-badge owner";
  if (position === "leader" || position.startsWith("ban_")) return "pos-badge head";
  return "pos-badge member";
}

export default function MembersPage() {
  const router = useRouter();
  const { data, error, post, can } = useClubData();
  const [view, setView] = useState<ViewMode>("list");
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [posFilter, setPosFilter] = useState<PosFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [emailOrCode, setEmailOrCode] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kickId, setKickId] = useState<string | null>(null);
  const [kickReason, setKickReason] = useState("");

  const members = data?.members ?? [];
  const teams = data?.teams ?? [];
  const canManage = can("manage_members");
  const canRoles = can("manage_roles");

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === "active").length;
    const pending = members.filter((m) => m.status === "pending").length;
    return {
      total,
      active,
      activePct: total ? Math.round((active / total) * 100) : 0,
      teams: teams.length,
      pending,
    };
  }, [members, teams]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (teamFilter !== "all" && m.teamId !== teamFilter) return false;
      if (posFilter === "owner" && m.position !== "owner") return false;
      if (posFilter === "member" && m.position !== "member") return false;
      if (
        posFilter === "leaders" &&
        !(m.position === "leader" || m.position.startsWith("ban_"))
      )
        return false;
      if (!needle) return true;
      return [m.fullName, m.email, m.studentCode, m.teamName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [members, q, teamFilter, posFilter]);

  const orgTree = useMemo(() => {
    const owners = shown.filter((m) => m.position === "owner");
    const byTeam = new Map<string, typeof shown>();
    for (const t of teams) byTeam.set(t.id, []);
    byTeam.set("__none__", []);
    for (const m of shown.filter((x) => x.position !== "owner")) {
      const key = m.teamId || "__none__";
      if (!byTeam.has(key)) byTeam.set(key, []);
      byTeam.get(key)!.push(m);
    }
    return { owners, byTeam };
  }, [shown, teams]);

  const invite = data?.inviteLink;
  const inviteUrl =
    typeof window !== "undefined" && invite
      ? `${window.location.origin}${invite.path}`
      : invite?.path ?? "";

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInviteMsg(null);
    try {
      const res = await post({
        action: "invite_member",
        emailOrCode: emailOrCode.trim(),
      });
      setInviteMsg(
        res.invite?.kind === "added"
          ? `Đã thêm ${res.invite.email}.`
          : `Mã mời ${res.invite?.code}`,
      );
      setEmailOrCode("");
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : "Không mời được");
    } finally {
      setBusy(false);
    }
  }

  async function confirmKick() {
    if (!kickId || kickReason.trim().length < 8) return;
    setBusy(true);
    try {
      await post({
        action: "kick_member",
        membershipId: kickId,
        note: kickReason.trim(),
      });
      setKickId(null);
      setKickReason("");
      setMenuId(null);
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : "Không kích được");
    } finally {
      setBusy(false);
    }
  }

  function MemberRow({ m }: { m: (typeof members)[0] }) {
    const open = menuId === m.id;
    return (
      <div className="hr-row">
        <button
          type="button"
          className="hr-row-main"
          onClick={() => router.push(`/members/${m.id}`)}
        >
          <div className="hr-avatar">{initials(m.fullName)}</div>
          <div className="hr-row-body">
            <div className="hr-name">{m.fullName ?? m.email}</div>
            <div className="hr-meta">
              <span className={posBadgeClass(m.position)}>
                {POSITION_LABEL[m.position] ?? m.position}
              </span>
              <span className="hr-dot">·</span>
              <span>{m.teamName ?? "Chưa gán ban"}</span>
            </div>
            <div className="hr-soft">
              {m.tasksDone ?? 0} task · {m.eventsJoined ?? 0} hoạt động
            </div>
          </div>
        </button>
        {(canManage || canRoles) && (
          <div className="hr-menu-wrap">
            <button
              type="button"
              className="hr-menu-btn"
              aria-label="Thao tác"
              onClick={(e) => {
                e.stopPropagation();
                setMenuId(open ? null : m.id);
              }}
            >
              ⋮
            </button>
            {open && (
              <div className="hr-menu">
                <button
                  type="button"
                  onClick={() => router.push(`/members/${m.id}`)}
                >
                  Hồ sơ
                </button>
                {canRoles && (
                  <button
                    type="button"
                    onClick={() => router.push(`/members/${m.id}?focus=role`)}
                  >
                    Đổi chức vụ
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => router.push(`/members/${m.id}?focus=team`)}
                  >
                    Chuyển ban
                  </button>
                )}
                {canManage && m.position !== "owner" && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setKickId(m.id);
                      setMenuId(null);
                    }}
                  >
                    Kích khỏi CLB
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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

      <section className="section hr-page">
        <div className="hr-strip">
          <div>
            <b>{stats.total}</b>
            <span>Tổng</span>
          </div>
          <div>
            <b>
              {stats.active}
              <em>{stats.activePct}%</em>
            </b>
            <span>Hoạt động</span>
          </div>
          <div>
            <b>{stats.teams}</b>
            <span>Ban</span>
          </div>
          <div>
            <b>{stats.pending}</b>
            <span>Chờ duyệt</span>
          </div>
        </div>

        <div className="hr-toolbar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, MSSV, email…"
            className="hr-search"
          />
          <div className="hr-view-toggle">
            {(
              [
                ["list", "DS"],
                ["table", "Bảng"],
                ["org", "Cây"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={view === k ? "on" : ""}
                onClick={() => setView(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="hr-filter-row">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="hr-select"
          >
            <option value="all">Mọi ban</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value as PosFilter)}
            className="hr-select"
          >
            <option value="all">Mọi chức vụ</option>
            <option value="owner">Chủ nhiệm</option>
            <option value="leaders">Trưởng ban</option>
            <option value="member">Thành viên</option>
          </select>
        </div>

        {canManage && (
          <button
            type="button"
            className="hr-invite-link"
            onClick={() => setShowInvite((v) => !v)}
          >
            {showInvite ? "Đóng mời thành viên" : "+ Mời thành viên"}
          </button>
        )}

        {showInvite && canManage && (
          <div className="hr-invite-panel">
            <form onSubmit={onInvite}>
              <input
                value={emailOrCode}
                onChange={(e) => setEmailOrCode(e.target.value)}
                placeholder="Email hoặc MSSV"
                required
                className="hr-search"
              />
              <button className="btn-primary solid" disabled={busy}>
                Gửi mời
              </button>
            </form>
            {invite && (
              <div className="hr-invite-meta">
                <p>
                  Mã <strong>{invite.code}</strong>
                </p>
                <p className="muted break">{inviteUrl}</p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(inviteUrl)
                      .then(() => setCopyMsg("Đã sao chép"))
                      .catch(() => setCopyMsg("Copy thủ công"))
                  }
                >
                  Sao chép link
                </button>
                {copyMsg && <span className="muted"> {copyMsg}</span>}
                <QrBlock value={inviteUrl || invite.path} size={140} />
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() =>
                    void post({ action: "rotate_invite_link" }).then(() =>
                      setInviteMsg("Đã đổi mã mời."),
                    )
                  }
                >
                  Đổi mã
                </button>
              </div>
            )}
            {inviteMsg && <p className="muted">{inviteMsg}</p>}
          </div>
        )}

        {view === "list" && (
          <div className="hr-list">
            {shown.map((m) => (
              <MemberRow key={m.id} m={m} />
            ))}
          </div>
        )}

        {view === "table" && (
          <div className="hr-table">
            {shown.map((m) => (
              <button
                type="button"
                key={m.id}
                className="hr-table-row"
                onClick={() => router.push(`/members/${m.id}`)}
              >
                <span className="hr-table-who">
                  <span className="hr-avatar sm">{initials(m.fullName)}</span>
                  <span>
                    <strong>{m.fullName}</strong>
                    <small>{m.studentCode}</small>
                  </span>
                </span>
                <span>{POSITION_LABEL[m.position] ?? m.position}</span>
                <span>{m.teamName ?? "—"}</span>
              </button>
            ))}
          </div>
        )}

        {view === "org" && (
          <div className="hr-org">
            {orgTree.owners.length > 0 && (
              <div className="hr-org-block">
                <p className="hr-org-label">Chủ nhiệm</p>
                {orgTree.owners.map((m) => (
                  <MemberRow key={m.id} m={m} />
                ))}
              </div>
            )}
            {[...orgTree.byTeam.entries()].map(([teamId, list]) => {
              if (!list.length) return null;
              const teamName =
                teamId === "__none__"
                  ? "Chưa gán ban"
                  : (teams.find((t) => t.id === teamId)?.name ?? "Ban");
              return (
                <div key={teamId} className="hr-org-block">
                  <p className="hr-org-label">{teamName}</p>
                  {list.map((m) => (
                    <MemberRow key={m.id} m={m} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {!shown.length && (
          <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
            Không có thành viên khớp bộ lọc.
          </p>
        )}
      </section>

      {kickId && (
        <div
          className="task-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setKickId(null)}
        >
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Kích khỏi CLB</h3>
            <p className="muted">Lý do ≥ 8 ký tự.</p>
            <textarea
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
              rows={3}
              className="hr-search"
              style={{ resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn-primary solid"
                style={{ background: "var(--pfc-danger)", flex: 1 }}
                disabled={busy || kickReason.trim().length < 8}
                onClick={() => void confirmKick()}
              >
                Xác nhận
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setKickId(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
