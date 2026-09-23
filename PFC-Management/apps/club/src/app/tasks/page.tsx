"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";
import { canTransitionTask, type TaskStatus } from "@/domain/task-fsm";

const COL_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Cần làm",
  in_progress: "Đang làm",
  review: "Chờ duyệt",
  done: "Hoàn thành",
};

const STATUS_PASTEL: Record<string, { label: string; cls: string }> = {
  backlog: { label: "⏳ Chưa làm", cls: "tm-badge backlog" },
  todo: { label: "⏳ Chưa làm", cls: "tm-badge backlog" },
  in_progress: { label: "🔄 Đang làm", cls: "tm-badge doing" },
  review: { label: "🔍 Chờ duyệt", cls: "tm-badge review" },
  done: { label: "✅ Hoàn thành", cls: "tm-badge done" },
};

const COL_ORDER = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const;

const PRIORITY_UI: Record<string, { label: string; cls: string }> = {
  high: { label: "🔴 High", cls: "tm-prio high" },
  medium: { label: "🟡 Medium", cls: "tm-prio mid" },
  low: { label: "🟢 Low", cls: "tm-prio low" },
};

type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  description?: string;
  deadline?: string | Date | null;
  progress?: number;
  progressPct?: number;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeInitials?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  activityId?: string | null;
  activityTitle?: string | null;
  checklistDone?: number;
  checklistTotal?: number;
  commentCount?: number;
  hasProof?: boolean;
  proofUrl?: string | null;
  subAssignees?: { id: string; name: string; initials: string }[];
};

type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeInitials?: string | null;
  deadline?: string | Date | null;
};

type DetailState = {
  task: BoardTask;
  checklist: ChecklistItem[];
  comments: {
    id: string;
    body: string;
    authorName?: string | null;
    createdAt?: string | Date;
  }[];
  activity: { id: string; text: string; createdAt?: string | Date }[];
};

type SubDraft = {
  key: string;
  title: string;
  assigneeId: string;
  deadline: string;
};

function formatDue(d?: string | Date | null) {
  if (!d) return "Chưa có hạn";
  try {
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function teamIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("truyền") || n.includes("media")) return "📣";
  if (n.includes("chuyên") || n.includes("content")) return "📚";
  if (n.includes("đối ngoại") || n.includes("partner")) return "🤝";
  if (n.includes("sự kiện") || n.includes("hr") || n.includes("event"))
    return "🎪";
  return "🏷️";
}

function shortTeamLabel(name: string) {
  const n = name.toLowerCase();
  if (n.includes("truyền")) return "Media";
  if (n.includes("chuyên")) return "Content";
  if (n.includes("đối ngoại")) return "Đối ngoại";
  if (n.includes("sự kiện") || n.includes("hr")) return "HR";
  return name.replace(/^Ban\s+/i, "");
}

export default function TasksPage() {
  const { data, error, post, reload, can } = useClubData();
  const [mode, setMode] = useState<"board" | "timeline">("board");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [progressDraft, setProgressDraft] = useState(0);
  const [proofLink, setProofLink] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [checkTitle, setCheckTitle] = useState("");
  const [checkAssignee, setCheckAssignee] = useState("");
  const [checkDeadline, setCheckDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form
  const [cTitle, setCTitle] = useState("");
  const [cActivityId, setCActivityId] = useState("");
  const [cPriority, setCPriority] = useState("medium");
  const [cDeadline, setCDeadline] = useState("");
  const [cTeamId, setCTeamId] = useState("");
  const [cSubs, setCSubs] = useState<SubDraft[]>([
    { key: "s1", title: "", assigneeId: "", deadline: "" },
  ]);

  const scope = data?.taskScope;
  const canManage = can("manage_tasks") || !!scope?.canManageTasks;
  const canFilterAll = !!scope?.canFilterAllTeams;
  const teams = data?.teams ?? [];
  const members = (data?.members ?? []).filter((m) => m.status === "active");
  const activities = data?.activities ?? [];

  useEffect(() => {
    if (!scope) return;
    if (scope.forcedTeamId) {
      setTeamFilter(scope.forcedTeamId);
      setCTeamId(scope.forcedTeamId);
    }
  }, [scope?.forcedTeamId]);

  const deptTabs = useMemo(() => {
    const tabs = canFilterAll
      ? [{ id: "all", label: "All", icon: "✨", name: "Tất cả" }]
      : [];
    for (const t of teams) {
      if (scope?.forcedTeamId && t.id !== scope.forcedTeamId) continue;
      tabs.push({
        id: t.id,
        label: shortTeamLabel(t.name),
        icon: teamIcon(t.name),
        name: t.name,
      });
    }
    return tabs;
  }, [teams, canFilterAll, scope?.forcedTeamId]);

  const selectedTeamId =
    teamFilter === "all" ? null : teamFilter || scope?.forcedTeamId || null;

  const membersForTeam = useMemo(() => {
    const tid = cTeamId || selectedTeamId;
    if (!tid) return members;
    return members.filter((m) => m.teamId === tid);
  }, [members, cTeamId, selectedTeamId]);

  function flattenBoard(): BoardTask[] {
    const kanban = data?.kanban ?? {};
    const out: BoardTask[] = [];
    for (const col of COL_ORDER) {
      for (const t of (kanban[col] ?? []) as BoardTask[]) out.push(t);
    }
    return out;
  }

  const filteredKanban = useMemo(() => {
    const kanban = data?.kanban ?? {};
    const result: Record<string, BoardTask[]> = {};
    for (const col of COL_ORDER) {
      let items = (kanban[col] ?? []) as BoardTask[];
      if (selectedTeamId) {
        items = items.filter((t) => t.teamId === selectedTeamId);
      }
      result[col] = items;
    }
    return result;
  }, [data?.kanban, selectedTeamId]);

  const filteredTimeline = useMemo(() => {
    let rows = data?.timeline ?? [];
    if (selectedTeamId) {
      const ids = new Set(
        flattenBoard()
          .filter((t) => t.teamId === selectedTeamId)
          .map((t) => t.id),
      );
      rows = rows.filter((t) => ids.has(t.id));
    }
    return rows;
  }, [data?.timeline, data?.kanban, selectedTeamId]);

  async function loadDetail(taskId: string) {
    setDetailLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/club?action=task_detail&taskId=${encodeURIComponent(taskId)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Không tải được task");
      const d: DetailState = {
        task: json.task,
        checklist: json.checklist ?? [],
        comments: json.comments ?? [],
        activity: json.activity ?? [],
      };
      setDetail(d);
      setProgressDraft(d.task.progressPct ?? d.task.progress ?? 0);
      setProofLink(d.task.proofUrl ?? "");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    void loadDetail(detailId);
  }, [detailId]);

  async function run(action: Record<string, unknown>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await post(action);
      if (ok) setMsg(ok);
      if (detailId) await loadDetail(detailId);
      else await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setBusy(false);
    }
  }

  function resetCreate() {
    setCTitle("");
    setCActivityId("");
    setCPriority("medium");
    setCDeadline("");
    setCTeamId(scope?.forcedTeamId ?? selectedTeamId ?? "");
    setCSubs([{ key: "s1", title: "", assigneeId: "", deadline: "" }]);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const subTasks = cSubs
        .filter((s) => s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          assigneeId: s.assigneeId || null,
          deadline: s.deadline || null,
        }));
      await post({
        action: "create_task",
        title: cTitle.trim(),
        priority: cPriority,
        deadline: cDeadline || null,
        teamId: cTeamId || undefined,
        activityId: cActivityId || null,
        subTasks,
      });
      setCreateOpen(false);
      resetCreate();
      setMsg("Đã tạo dự án / task chính");
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Tạo thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader title="Công việc" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <div className="tm-hero">
        <div>
          <p className="tm-hero-kicker">Task Hub</p>
          <h1 className="tm-hero-title">Dự án & đầu việc</h1>
          <p className="tm-hero-sub">
            {scope?.assigneeOnly
              ? "Chỉ việc được giao cho bạn"
              : scope?.forcedTeamId
                ? "Ban của bạn — quản lý & giao việc nội bộ"
                : "Lọc theo ban · giao sub-task theo thành viên"}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="tm-fab"
            onClick={() => {
              resetCreate();
              setCreateOpen(true);
            }}
          >
            + Tạo task
          </button>
        )}
      </div>

      {deptTabs.length > 0 && (
        <div className="tm-dept-bar" role="tablist" aria-label="Lọc theo ban">
          {deptTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={teamFilter === tab.id}
              className={`tm-dept-chip${teamFilter === tab.id ? " active" : ""}`}
              onClick={() => setTeamFilter(tab.id)}
              title={tab.name}
            >
              <span aria-hidden>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="chips tm-mode-chips">
        <button
          type="button"
          className={`chip${mode === "board" ? " active" : ""}`}
          onClick={() => setMode("board")}
        >
          Kanban
        </button>
        <button
          type="button"
          className={`chip${mode === "timeline" ? " active" : ""}`}
          onClick={() => setMode("timeline")}
        >
          Timeline
        </button>
      </div>

      {msg && <p className="tm-toast">{msg}</p>}

      {mode === "board" ? (
        <div className="section kanban-scroll tm-kanban">
          {COL_ORDER.map((col) => {
            const items = filteredKanban[col] ?? [];
            return (
              <div key={col} className="kanban-col tm-col">
                <h4>
                  {COL_LABEL[col]} · {items.length}
                </h4>
                {items.map((t) => {
                  const done = t.checklistDone ?? 0;
                  const total = t.checklistTotal ?? 0;
                  const pct =
                    total > 0
                      ? Math.round((done / total) * 100)
                      : (t.progressPct ?? t.progress ?? 0);
                  const badge = STATUS_PASTEL[t.status] ?? STATUS_PASTEL.todo;
                  const prio = PRIORITY_UI[t.priority] ?? PRIORITY_UI.medium;
                  const avatars = t.subAssignees?.length
                    ? t.subAssignees
                    : t.assigneeInitials
                      ? [
                          {
                            id: t.assigneeId ?? "a",
                            name: t.assigneeName ?? "",
                            initials: t.assigneeInitials,
                          },
                        ]
                      : [];
                  return (
                    <button
                      type="button"
                      key={t.id}
                      className="tm-card"
                      onClick={() => setDetailId(t.id)}
                    >
                      <div className="tm-card-top">
                        <span className={badge.cls}>{badge.label}</span>
                        <span className={prio.cls}>{prio.label}</span>
                      </div>
                      <div className="tm-card-title">{t.title}</div>
                      {t.teamName && (
                        <span className="tm-team-pill">
                          {teamIcon(t.teamName)} {t.teamName}
                        </span>
                      )}
                      {t.activityTitle && (
                        <span className="tm-act-pill">📅 {t.activityTitle}</span>
                      )}
                      <div className="tm-progress">
                        <div className="tm-progress-meta">
                          <span>
                            {done}/{total || "—"} sub-tasks
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="tm-progress-track">
                          <div
                            className="tm-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="tm-card-foot">
                        <div className="tm-avatars">
                          {avatars.slice(0, 4).map((a, i) => (
                            <span
                              key={a.id}
                              className="tm-avatar"
                              style={{ zIndex: 4 - i }}
                              title={a.name}
                            >
                              {a.initials}
                            </span>
                          ))}
                          {!avatars.length && (
                            <span className="muted" style={{ fontSize: 11 }}>
                              Chưa gán
                            </span>
                          )}
                        </div>
                        <span className="tm-due">🗓 {formatDue(t.deadline)}</span>
                      </div>
                    </button>
                  );
                })}
                {!items.length && (
                  <p className="muted" style={{ padding: "4px 6px" }}>
                    Trống
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <section className="section">
          {filteredTimeline.map((t) => (
            <button
              type="button"
              key={t.id}
              className="list-row list-row-btn tm-timeline-row"
              onClick={() => setDetailId(t.id)}
            >
              <div className="avatar">📅</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                <div className="muted">
                  {COL_LABEL[t.status] ?? t.status} · {formatDue(t.deadline)}
                </div>
              </div>
            </button>
          ))}
          {!filteredTimeline.length && (
            <p className="muted">Chưa có task có deadline.</p>
          )}
        </section>
      )}

      {createOpen && (
        <div
          className="task-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setCreateOpen(false)}
        >
          <form
            className="task-modal tm-create-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void submitCreate(e)}
          >
            <div className="task-modal-header">
              <h2>Tạo dự án / task chính</h2>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCreateOpen(false)}
              >
                Đóng
              </button>
            </div>

            <fieldset className="tm-fieldset">
              <legend>1 · Thông tin chung</legend>
              <label className="tm-label">
                Tiêu đề
                <input
                  required
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  placeholder="VD: Workshop CFA Preparation"
                />
              </label>
              <label className="tm-label">
                Hoạt động liên quan
                <select
                  value={cActivityId}
                  onChange={(e) => setCActivityId(e.target.value)}
                >
                  <option value="">— Không gắn —</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="tm-row2">
                <label className="tm-label">
                  Priority
                  <select
                    value={cPriority}
                    onChange={(e) => setCPriority(e.target.value)}
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </label>
                <label className="tm-label">
                  Deadline
                  <input
                    type="datetime-local"
                    value={cDeadline}
                    onChange={(e) => setCDeadline(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="tm-fieldset">
              <legend>2 · Ban phụ trách</legend>
              <div className="tm-dept-pick">
                {teams
                  .filter(
                    (t) => !scope?.forcedTeamId || t.id === scope.forcedTeamId,
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`tm-dept-chip${cTeamId === t.id ? " active" : ""}`}
                      onClick={() => setCTeamId(t.id)}
                    >
                      <span aria-hidden>{teamIcon(t.name)}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
              </div>
              {!cTeamId && (
                <p className="muted" style={{ fontSize: 12 }}>
                  Chọn ban để lọc thành viên giao sub-task.
                </p>
              )}
            </fieldset>

            <fieldset className="tm-fieldset">
              <legend>3 · Sub-tasks & người nhận</legend>
              {cSubs.map((s, idx) => (
                <div key={s.key} className="tm-sub-row">
                  <input
                    placeholder={`Sub-task #${idx + 1}`}
                    value={s.title}
                    onChange={(e) =>
                      setCSubs((prev) =>
                        prev.map((x) =>
                          x.key === s.key ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <select
                    value={s.assigneeId}
                    onChange={(e) =>
                      setCSubs((prev) =>
                        prev.map((x) =>
                          x.key === s.key
                            ? { ...x, assigneeId: e.target.value }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="">Assignee</option>
                    {membersForTeam.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.fullName ?? m.email}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={s.deadline}
                    onChange={(e) =>
                      setCSubs((prev) =>
                        prev.map((x) =>
                          x.key === s.key
                            ? { ...x, deadline: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                  {cSubs.length > 1 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        setCSubs((prev) => prev.filter((x) => x.key !== s.key))
                      }
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="tm-add-sub"
                onClick={() =>
                  setCSubs((prev) => [
                    ...prev,
                    {
                      key: `s${Date.now()}`,
                      title: "",
                      assigneeId: "",
                      deadline: "",
                    },
                  ])
                }
              >
                + Add Sub-task
              </button>
            </fieldset>

            <button
              type="submit"
              className="btn-primary solid tm-submit"
              disabled={busy || !cTitle.trim()}
            >
              {busy ? "Đang tạo…" : "Tạo dự án"}
            </button>
          </form>
        </div>
      )}

      {detailId && (
        <div
          className="task-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailId(null)}
        >
          <div
            className="task-modal tm-detail"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading && !detail ? (
              <p className="muted">Đang tải chi tiết…</p>
            ) : detail ? (
              <>
                <div className="task-modal-header">
                  <h2>{detail.task.title}</h2>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setDetailId(null)}
                  >
                    Đóng
                  </button>
                </div>

                <div className="status-rail">
                  {COL_ORDER.map((s) => {
                    const from = detail.task.status as TaskStatus;
                    const legal =
                      s === from || canTransitionTask(from, s as TaskStatus);
                    const active = s === from;
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`status-chip${active ? " active" : ""}`}
                        disabled={busy || active || !legal}
                        onClick={() =>
                          void run(
                            {
                              action: "task_transition",
                              taskId: detail.task.id,
                              to: s,
                              ...(s === "review" && proofLink
                                ? {
                                    proofOfWork: proofLink.startsWith("link:")
                                      ? proofLink
                                      : `link:${proofLink}`,
                                  }
                                : {}),
                            },
                            `Đã chuyển → ${COL_LABEL[s]}`,
                          )
                        }
                      >
                        {STATUS_PASTEL[s]?.label ?? COL_LABEL[s]}
                      </button>
                    );
                  })}
                </div>

                <div className="card task-meta-grid">
                  <div>
                    <div className="muted">Ban</div>
                    <strong>{detail.task.teamName ?? "—"}</strong>
                  </div>
                  <div>
                    <div className="muted">Hoạt động</div>
                    <strong>{detail.task.activityTitle ?? "—"}</strong>
                  </div>
                  <div>
                    <div className="muted">Hạn chót</div>
                    <strong>{formatDue(detail.task.deadline)}</strong>
                  </div>
                  <div>
                    <div className="muted">Ưu tiên</div>
                    <span
                      className={
                        (PRIORITY_UI[detail.task.priority] ?? PRIORITY_UI.medium)
                          .cls
                      }
                    >
                      {
                        (PRIORITY_UI[detail.task.priority] ?? PRIORITY_UI.medium)
                          .label
                      }
                    </span>
                  </div>
                </div>

                <div className="card">
                  <h3>
                    Sub-tasks ({detail.checklist.filter((c) => c.done).length}/
                    {detail.checklist.length})
                  </h3>
                  {detail.checklist.map((c) => (
                    <label key={c.id} className="check-row tm-check">
                      <input
                        type="checkbox"
                        checked={c.done}
                        disabled={busy}
                        onChange={() =>
                          void run({
                            action: "toggle_checklist",
                            itemId: c.id,
                            done: !c.done,
                          })
                        }
                      />
                      <span
                        style={{
                          textDecoration: c.done ? "line-through" : "none",
                          flex: 1,
                        }}
                      >
                        {c.title}
                      </span>
                      {c.assigneeInitials && (
                        <span
                          className="tm-avatar sm"
                          title={c.assigneeName ?? ""}
                        >
                          {c.assigneeInitials}
                        </span>
                      )}
                      {c.deadline && (
                        <span className="muted" style={{ fontSize: 11 }}>
                          {formatDue(c.deadline)}
                        </span>
                      )}
                    </label>
                  ))}
                  {canManage && (
                    <div className="tm-sub-add">
                      <input
                        value={checkTitle}
                        onChange={(e) => setCheckTitle(e.target.value)}
                        placeholder="Thêm sub-task…"
                      />
                      <select
                        value={checkAssignee}
                        onChange={(e) => setCheckAssignee(e.target.value)}
                      >
                        <option value="">Assignee</option>
                        {members
                          .filter(
                            (m) =>
                              !detail.task.teamId ||
                              m.teamId === detail.task.teamId,
                          )
                          .map((m) => (
                            <option key={m.memberId} value={m.memberId}>
                              {m.fullName ?? m.email}
                            </option>
                          ))}
                      </select>
                      <input
                        type="datetime-local"
                        value={checkDeadline}
                        onChange={(e) => setCheckDeadline(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={busy || !checkTitle.trim()}
                        onClick={() => {
                          void run({
                            action: "add_checklist",
                            taskId: detail.task.id,
                            title: checkTitle.trim(),
                            assigneeId: checkAssignee || null,
                            deadline: checkDeadline || null,
                          }).then(() => {
                            setCheckTitle("");
                            setCheckAssignee("");
                            setCheckDeadline("");
                          });
                        }}
                      >
                        Thêm
                      </button>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3>Cập nhật tiến độ</h3>
                  <div className="progress-meta">
                    <strong>{progressDraft}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progressDraft}
                    onChange={(e) => setProgressDraft(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <button
                    type="button"
                    className="btn-primary solid"
                    disabled={busy}
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      void run(
                        {
                          action: "set_task_progress",
                          taskId: detail.task.id,
                          progress: progressDraft,
                        },
                        `Đã lưu tiến độ ${progressDraft}%`,
                      )
                    }
                  >
                    Lưu tiến độ
                  </button>
                </div>

                <div className="card">
                  <h3>Bằng chứng / Proof</h3>
                  <input
                    value={proofLink}
                    onChange={(e) => setProofLink(e.target.value)}
                    placeholder="https://…"
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid var(--pfc-border)",
                      font: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy || !proofLink.trim()}
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      void run(
                        {
                          action: "attach_proof",
                          taskId: detail.task.id,
                          proofOfWork: proofLink.startsWith("link:")
                            ? proofLink
                            : `link:${proofLink}`,
                        },
                        "Đã gắn proof",
                      )
                    }
                  >
                    Lưu proof
                  </button>
                </div>

                <div className="card">
                  <h3>Ghi chú</h3>
                  {detail.comments.map((c) => (
                    <div key={c.id} className="tm-comment">
                      <strong>{c.authorName ?? "—"}</strong>
                      <p>{c.body}</p>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Thêm ghi chú…"
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 10,
                        border: "1px solid var(--pfc-border)",
                        font: "inherit",
                      }}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={busy || !commentBody.trim()}
                      onClick={() => {
                        void run({
                          action: "add_task_comment",
                          taskId: detail.task.id,
                          body: commentBody.trim(),
                        }).then(() => setCommentBody(""));
                      }}
                    >
                      Gửi
                    </button>
                  </div>
                </div>

                {can("review_tasks") && detail.task.status === "review" && (
                  <div className="card">
                    <h3>Duyệt hoàn thành</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary solid"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            {
                              action: "review_task",
                              taskId: detail.task.id,
                              decision: "approve",
                            },
                            "Đã duyệt ✅",
                          )
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={busy}
                        onClick={() =>
                          void run({
                            action: "review_task",
                            taskId: detail.task.id,
                            decision: "request_changes",
                            reason: "Cần chỉnh sửa",
                          })
                        }
                      >
                        Request changes
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">{msg ?? "Không tải được"}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
