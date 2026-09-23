"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

const POSITION_LABEL: Record<string, string> = {
  owner: "Chủ nhiệm",
  leader: "Ban điều hành",
  ban_chuyen_mon: "Trưởng ban Chuyên môn",
  ban_truyen_thong: "Trưởng ban Truyền thông",
  ban_su_kien: "Trưởng ban Sự kiện",
  member: "Thành viên",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  active: "Đang hoạt động",
  inactive: "Tạm dừng",
  alumni: "Cựu thành viên",
  left: "Đã rời",
  rejected: "Từ chối",
};

const ASSIGNABLE = [
  "leader",
  "ban_chuyen_mon",
  "ban_truyen_thong",
  "ban_su_kien",
  "member",
] as const;

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

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

type TimelineItem = {
  id: string;
  title: string;
  status: string;
  kind: "task" | "activity";
  priority?: string;
  updatedAt?: string | Date;
};

function MemberProfileInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const focus = search.get("focus");
  const { data, error, loading, post, can } = useClubData();
  const homeMember = data?.members.find(
    (row) => row.id === id || row.memberId === id,
  );

  const [m, setM] = useState(homeMember);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [position, setPosition] = useState("");
  const [teamId, setTeamId] = useState("");
  const [kickReason, setKickReason] = useState("");
  const [showKick, setShowKick] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canRoles = can("manage_roles");
  const canMembers = can("manage_members");
  const canApprove = can("approve_memberships");
  const isSelf = m && data?.user?.id === m.memberId;
  const iAmOwner =
    data?.myMembership?.position === "owner" || data?.user?.isSuperAdmin;
  const myPos = data?.myMembership?.position ?? "";
  const myTeamId = data?.myMembership?.teamId ?? null;
  const isBanLead = String(myPos).startsWith("ban_") && !!myTeamId;
  const canAssignTeam = canMembers || isBanLead;

  const POSITION_DEFAULT_TEAM: Record<string, string> = {
    ban_chuyen_mon: "Ban Chuyên môn",
    ban_truyen_thong: "Ban Truyền thông",
    ban_su_kien: "Ban Sự kiện",
  };

  const teamOptions = (data?.teams ?? []).filter((t) => {
    if (canMembers) return true;
    if (isBanLead) return t.id === myTeamId;
    return false;
  });

  function onPositionChange(next: string) {
    setPosition(next);
    const want = POSITION_DEFAULT_TEAM[next];
    if (!want) return;
    const match = (data?.teams ?? []).find(
      (t) => t.name.localeCompare(want, "vi", { sensitivity: "accent" }) === 0
        || t.name.toLocaleLowerCase("vi") === want.toLocaleLowerCase("vi"),
    );
    if (match) setTeamId(match.id);
  }

  useEffect(() => {
    setM(homeMember);
    if (homeMember) {
      setPosition(
        homeMember.position === "owner" ? "leader" : homeMember.position,
      );
      setTeamId(homeMember.teamId ?? "");
    }
  }, [homeMember]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await fetch(
          `/api/club?action=member_hr_profile&membershipId=${encodeURIComponent(id)}`,
        );
        const json = await res.json();
        if (res.ok && json.member) {
          setM(json.member);
          setTimeline(json.timeline ?? []);
          setPosition(
            json.member.position === "owner"
              ? "leader"
              : json.member.position,
          );
          setTeamId(json.member.teamId ?? "");
        }
      } catch {
        /* home fallback */
      }
    })();
  }, [id]);

  useEffect(() => {
    if (focus === "role" || focus === "team") {
      const el = document.getElementById(
        focus === "role" ? "hr-role-box" : "hr-team-box",
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focus, m]);

  async function run(action: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      await post(action);
      setMsg(okMsg);
      if (action.action === "kick_member") router.push("/members");
      const res = await fetch(
        `/api/club?action=member_hr_profile&membershipId=${encodeURIComponent(id)}`,
      );
      const json = await res.json();
      if (res.ok && json.member) {
        setM(json.member);
        setTimeline(json.timeline ?? []);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Thất bại");
    } finally {
      setBusy(false);
    }
  }

  const tasksDone = m?.tasksDone ?? 0;
  const tasksTotal = Math.max(m?.tasksTotal ?? 0, tasksDone);
  const taskPct = tasksTotal
    ? Math.round((tasksDone / tasksTotal) * 100)
    : 0;

  return (
    <>
      <AppHeader title="Hồ sơ thành viên" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <section className="section">
        {loading && !m && <p className="muted">Đang tải...</p>}
        {!loading && !m && (
          <p className="muted">Không tìm thấy thành viên trong CLB này.</p>
        )}
        {m && (
          <div className="hr-profile">
            <div className="hr-profile-left card">
              <div className="hr-avatar xl">{initials(m.fullName)}</div>
              <h2 style={{ margin: "10px 0 4px", fontSize: 18 }}>
                {m.fullName ?? m.email}
              </h2>
              <span className="pos-badge head">
                {POSITION_LABEL[m.position] ?? m.position}
              </span>
              <div className="hr-id-list">
                <div>
                  <span className="muted">Email</span>
                  <div>{m.email ?? "—"}</div>
                </div>
                <div>
                  <span className="muted">MSSV</span>
                  <div>{m.studentCode ?? "—"}</div>
                </div>
                <div>
                  <span className="muted">Trạng thái</span>
                  <div>
                    <span
                      className={`badge${m.status === "active" ? " ok" : m.status === "pending" ? " warn" : ""}`}
                    >
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="muted">Ngày tham gia</span>
                  <div>{formatDate(m.joinedAt ?? m.createdAt)}</div>
                </div>
                <div>
                  <span className="muted">Ban</span>
                  <div>{m.teamName ?? "Chưa gán ban"}</div>
                </div>
              </div>

              {(canApprove || canMembers) && !isSelf && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    Đổi trạng thái nhanh
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {m.status === "active" && (
                      <>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              {
                                action: "membership_transition",
                                membershipId: m.id,
                                to: "inactive",
                              },
                              "Đã tạm dừng.",
                            )
                          }
                        >
                          → Tạm dừng
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              {
                                action: "membership_transition",
                                membershipId: m.id,
                                to: "alumni",
                              },
                              "Đã chuyển Cựu TV.",
                            )
                          }
                        >
                          → Cựu thành viên
                        </button>
                      </>
                    )}
                    {(m.status === "inactive" || m.status === "alumni") && (
                      <button
                        type="button"
                        className="btn-primary solid"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            {
                              action: "membership_transition",
                              membershipId: m.id,
                              to: "active",
                            },
                            "Đã kích hoạt lại.",
                          )
                        }
                      >
                        → Đang hoạt động
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hr-profile-right">
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Thống kê đóng góp</h3>
                <div className="progress-meta">
                  <span>
                    Task hoàn thành {tasksDone}/{tasksTotal || "—"}
                  </span>
                  <strong>{taskPct}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${taskPct}%` }}
                  />
                </div>
                <div className="hr-kpis" style={{ marginTop: 12 }}>
                  <span className="hr-kpi">
                    Sự kiện / HĐ: {m.eventsJoined ?? 0}
                  </span>
                  <span className="hr-kpi">KPI: {m.kpiScore ?? 0}</span>
                </div>
              </div>

              {(canRoles || canMembers) && (
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Quản trị BĐH</h3>

                  {canRoles && ["active", "inactive"].includes(m.status) && (
                    <div id="hr-role-box" style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 650, marginBottom: 6 }}>
                        Đổi chức vụ / Bổ nhiệm
                      </div>
                      <select
                        value={position}
                        onChange={(e) => onPositionChange(e.target.value)}
                        disabled={m.position === "owner"}
                        className="hr-select"
                      >
                        {ASSIGNABLE.map((p) => (
                          <option key={p} value={p}>
                            {POSITION_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      {m.position !== "owner" && (
                        <button
                          type="button"
                          className="btn-primary solid"
                          disabled={busy}
                          style={{ marginTop: 8, width: "100%" }}
                          onClick={() =>
                            void run(
                              {
                                action: "assign_position",
                                membershipId: m.id,
                                position,
                              },
                              "Cập nhật quyền thành công",
                            )
                          }
                        >
                          Lưu chức vụ
                        </button>
                      )}
                      {m.position !== "owner" &&
                        iAmOwner &&
                        m.status === "active" && (
                          <button
                            type="button"
                            className="btn-primary solid"
                            disabled={busy}
                            style={{
                              marginTop: 8,
                              width: "100%",
                              background: "#6b5a9e",
                            }}
                            onClick={() => {
                              if (
                                !confirm(
                                  "Bàn giao quyền Chủ nhiệm cho thành viên này?",
                                )
                              )
                                return;
                              void run(
                                {
                                  action: "transfer_owner",
                                  membershipId: m.id,
                                },
                                "Đã chuyển quyền Chủ nhiệm.",
                              );
                            }}
                          >
                            Chuyển quyền Chủ nhiệm (Transfer Owner)
                          </button>
                        )}
                    </div>
                  )}

                  {canAssignTeam &&
                    ["active", "inactive", "pending"].includes(m.status) && (
                      <div id="hr-team-box" style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 650, marginBottom: 6 }}>
                          Chuyển Ban
                        </div>
                        <select
                          value={teamId}
                          onChange={(e) => setTeamId(e.target.value)}
                          className="hr-select"
                        >
                          {canMembers && (
                            <option value="">— Chưa gán ban —</option>
                          )}
                          {teamOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-primary solid"
                          disabled={busy || (!canMembers && !teamId)}
                          style={{ marginTop: 8, width: "100%" }}
                          onClick={() =>
                            void run(
                              {
                                action: "assign_team",
                                membershipId: m.id,
                                teamId: teamId || null,
                              },
                              "Cập nhật ban thành công",
                            )
                          }
                        >
                          Lưu ban
                        </button>
                        {isBanLead && !canMembers && (
                          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                            Trưởng ban chỉ gán thành viên vào ban của mình.
                          </p>
                        )}
                      </div>
                    )}

                  {canMembers &&
                    !isSelf &&
                    ["active", "inactive"].includes(m.status) && (
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: 8,
                            color: "var(--pfc-danger)",
                          }}
                        >
                          Kỷ luật / Kích khỏi CLB
                        </div>
                        {!showKick ? (
                          <button
                            type="button"
                            className="btn-primary solid"
                            style={{
                              background: "var(--pfc-danger)",
                              width: "100%",
                            }}
                            onClick={() => setShowKick(true)}
                          >
                            Kích khỏi CLB
                          </button>
                        ) : (
                          <>
                            <textarea
                              value={kickReason}
                              onChange={(e) => setKickReason(e.target.value)}
                              rows={3}
                              placeholder="Lý do ≥ 8 ký tự…"
                              style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid var(--pfc-border)",
                                font: "inherit",
                              }}
                            />
                            <div
                              style={{ display: "flex", gap: 8, marginTop: 8 }}
                            >
                              <button
                                type="button"
                                className="btn-primary solid"
                                disabled={busy || kickReason.trim().length < 8}
                                style={{
                                  background: "var(--pfc-danger)",
                                  flex: 1,
                                }}
                                onClick={() => {
                                  if (!confirm("Xác nhận kích khỏi CLB?"))
                                    return;
                                  void run(
                                    {
                                      action: "kick_member",
                                      membershipId: m.id,
                                      note: kickReason,
                                    },
                                    "Đã kích.",
                                  );
                                }}
                              >
                                Xác nhận kích
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setShowKick(false)}
                              >
                                Hủy
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                </div>
              )}

              <div className="card">
                <h3 style={{ marginTop: 0 }}>Lịch sử hoạt động</h3>
                {!timeline.length && (
                  <p className="muted">Chưa có task / hoạt động ghi nhận.</p>
                )}
                <div className="activity-list">
                  {timeline.map((item) => (
                    <div key={`${item.kind}-${item.id}`} className="activity-item">
                      <strong>
                        {item.kind === "task" ? "Task" : "HĐ"} · {item.title}
                      </strong>
                      <div className="muted">
                        {item.status}
                        {item.updatedAt
                          ? ` · ${new Date(item.updatedAt).toLocaleDateString("vi-VN")}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {msg && <p className="muted">{msg}</p>}
              <Link href="/members" className="btn-ghost">
                ← Danh sách thành viên
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default function MemberProfilePage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải...</p>}>
      <MemberProfileInner />
    </Suspense>
  );
}
