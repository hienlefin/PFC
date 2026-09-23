"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { PfcLogo } from "@/components/MobileChrome";
import {
  BRANCHES,
  CURRENT_USER,
  DEPARTMENTS,
  INITIAL_TASKS,
  MEMBERS,
  branchById,
  defaultSupervisorForAssignee,
  departmentById,
  memberById,
  supervisors,
} from "./task-data";
import {
  canAssignTask,
  canRemindReview,
  canReview,
  canSubmit,
  formatDeadlineFull,
  formatDeadlineRelative,
  formatLateDuration,
  historyIcon,
  isDueSoon,
  isOpenStatus,
  isOverdue,
  isSubmitted,
  isValidHttpUrl,
  latestReviewComment,
  needsReminder,
  sortByDeadlineAsc,
  statusLabel,
} from "./task-helpers";
import {
  createTask,
  notifyAssignee,
  notifySupervisor,
  reviewTask,
  sendDeadlineReminder,
  sendReviewReminder,
  submitTask,
} from "./task-api";
import type {
  BranchId,
  EvidenceFile,
  Priority,
  ReviewResult,
  Submission,
  Task,
} from "./task-types";

type Screen = "home" | "branch" | "nudge" | "review_queue";
type BranchTab = "open" | "submitted" | "nudge" | "done";

type AssignForm = {
  title: string;
  branchId: BranchId;
  assigneeId: string;
  supervisorId: string;
  date: string;
  time: string;
  priority: Priority;
  note: string;
};

type AssignErrors = Partial<
  Record<"title" | "assigneeId" | "deadline", string>
>;

type SubmitForm = {
  links: string[];
  files: EvidenceFile[];
  note: string;
};

type SubmitErrors = Partial<Record<"evidence" | `link_${number}`, string>>;

type ReviewForm = {
  result: ReviewResult | null;
  comment: string;
  date: string;
  time: string;
};

type ReviewErrors = Partial<
  Record<"result" | "comment" | "deadline", string>
>;

function emptyAssign(branchId?: BranchId): AssignForm {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 2);
  return {
    title: "",
    branchId: branchId ?? "club_management",
    assigneeId: "",
    supervisorId: "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    priority: "medium",
    note: "",
  };
}

function emptySubmit(): SubmitForm {
  return { links: [""], files: [], note: "" };
}

function emptyReview(): ReviewForm {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 48);
  return {
    result: null,
    comment: "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
  };
}

function firstName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] ?? full;
}

function fileId() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [screen, setScreen] = useState<Screen>("home");
  const [branchId, setBranchId] = useState<BranchId | null>(null);
  const [branchTab, setBranchTab] = useState<BranchTab>("open");
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignForm>(emptyAssign());
  const [assignErrors, setAssignErrors] = useState<AssignErrors>({});
  const [submitTaskId, setSubmitTaskId] = useState<string | null>(null);
  const [submitForm, setSubmitForm] = useState<SubmitForm>(emptySubmit());
  const [submitErrors, setSubmitErrors] = useState<SubmitErrors>({});
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReview());
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [frameEl, setFrameEl] = useState<Element | null>(null);
  const [tick, setTick] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(true);

  const allowAssign = canAssignTask(CURRENT_USER);

  useEffect(() => {
    setFrameEl(document.querySelector(".phone-frame"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [tick, tasks]);

  const openTasks = useMemo(() => tasks.filter(isOpenStatus), [tasks]);
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === "done"),
    [tasks],
  );
  const pendingReview = useMemo(
    () =>
      tasks
        .filter((t) => isSubmitted(t) && canReview(t, CURRENT_USER))
        .sort(sortByDeadlineAsc),
    [tasks],
  );
  const nudgeTasks = useMemo(
    () => tasks.filter((t) => needsReminder(t, now)).sort(sortByDeadlineAsc),
    [tasks, now],
  );
  const nudgePending = useMemo(
    () => nudgeTasks.filter((t) => !t.lastRemindedAt),
    [nudgeTasks],
  );
  const nudgedCount = nudgeTasks.length - nudgePending.length;

  const branchStats = useMemo(() => {
    return BRANCHES.map((b) => {
      const all = tasks.filter((t) => t.branchId === b.id);
      const open = all.filter(isOpenStatus);
      const done = all.filter((t) => t.status === "done");
      const waiting = all.filter(isSubmitted);
      const overdue = open.filter((t) => isOverdue(t, now));
      const soon = open.filter((t) => isDueSoon(t, now));
      const total = all.length || 1;
      const pct = Math.round((done.length / total) * 100);
      return {
        branch: b,
        open: open.length,
        done: done.length,
        total: all.length,
        overdue: overdue.length,
        soon: soon.length,
        waiting: waiting.length,
        pct,
      };
    });
  }, [tasks, now]);

  const activeBranch = branchId ? branchById(branchId) : null;

  const branchLists = useMemo(() => {
    if (!branchId) {
      return { open: [], submitted: [], nudge: [], done: [] };
    }
    const list = tasks.filter((t) => t.branchId === branchId);
    return {
      open: list.filter(isOpenStatus).sort(sortByDeadlineAsc),
      submitted: list.filter(isSubmitted).sort(sortByDeadlineAsc),
      nudge: list.filter((t) => needsReminder(t, now)).sort(sortByDeadlineAsc),
      done: list.filter((t) => t.status === "done").sort(sortByDeadlineAsc),
    };
  }, [tasks, branchId, now]);

  const branchAssignees = useMemo(() => {
    if (!branchId) return 0;
    const ids = new Set(
      tasks
        .filter((t) => t.branchId === branchId && isOpenStatus(t))
        .map((t) => t.assigneeId),
    );
    return ids.size;
  }, [tasks, branchId]);

  const submitTarget = submitTaskId
    ? tasks.find((t) => t.id === submitTaskId)
    : null;
  const reviewTarget = reviewTaskId
    ? tasks.find((t) => t.id === reviewTaskId)
    : null;
  const detailTarget = detailTaskId
    ? tasks.find((t) => t.id === detailTaskId)
    : null;

  function openBranch(id: BranchId) {
    setBranchId(id);
    setBranchTab("open");
    setScreen("branch");
  }

  function openAssign(preset?: BranchId) {
    setAssignForm(emptyAssign(preset ?? branchId ?? undefined));
    setAssignErrors({});
    setShowAssign(true);
  }

  function openSubmit(task: Task) {
    setSubmitTaskId(task.id);
    setSubmitForm(emptySubmit());
    setSubmitErrors({});
  }

  function openReview(task: Task) {
    setReviewTaskId(task.id);
    setReviewForm(emptyReview());
    setReviewErrors({});
  }

  async function remind(task: Task) {
    if (task.lastRemindedAt) return;
    const assignee = memberById(task.assigneeId);
    const supervisor = memberById(task.supervisorId);
    await sendDeadlineReminder(task.id, [task.assigneeId, task.supervisorId]);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, lastRemindedAt: new Date().toISOString() }
          : t,
      ),
    );
    setToast(
      `Đã gửi nhắc tới ${firstName(assignee?.name ?? "TV")} và ${firstName(supervisor?.name ?? "TB")}`,
    );
  }

  async function remindAll() {
    const pending = nudgeTasks.filter((t) => !t.lastRemindedAt);
    for (const t of pending) {
      await sendDeadlineReminder(t.id, [t.assigneeId, t.supervisorId]);
    }
    const stamp = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        pending.some((p) => p.id === t.id)
          ? { ...t, lastRemindedAt: stamp }
          : t,
      ),
    );
    setToast(`Đã giục ${pending.length} việc`);
  }

  async function remindReview(task: Task) {
    if (task.lastReviewRemindedAt) return;
    await sendReviewReminder(task.id, task.supervisorId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, lastReviewRemindedAt: new Date().toISOString() }
          : t,
      ),
    );
    const s = memberById(task.supervisorId);
    setToast(`Đã nhắc ${firstName(s?.name ?? "take care")} duyệt`);
  }

  function validateAssign(): AssignErrors {
    const err: AssignErrors = {};
    if (!assignForm.title.trim()) err.title = "Nhập tên task";
    if (!assignForm.assigneeId) err.assigneeId = "Chọn người thực hiện";
    if (!assignForm.date || !assignForm.time) {
      err.deadline = "Chọn đủ ngày và giờ deadline";
    } else {
      const due = new Date(`${assignForm.date}T${assignForm.time}:00`);
      if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
        err.deadline = "Deadline phải sau thời điểm hiện tại";
      }
    }
    return err;
  }

  async function submitAssign() {
    const err = validateAssign();
    setAssignErrors(err);
    if (Object.keys(err).length) return;
    if (!assignForm.supervisorId) return;

    const dueDate = new Date(
      `${assignForm.date}T${assignForm.time}:00`,
    ).toISOString();
    const created = await createTask({
      title: assignForm.title,
      branchId: assignForm.branchId,
      assigneeId: assignForm.assigneeId,
      supervisorId: assignForm.supervisorId,
      dueDate,
      priority: assignForm.priority,
      note: assignForm.note,
      actorId: CURRENT_USER.id,
    });
    await notifyAssignee(created.id);
    setTasks((prev) => [created, ...prev]);
    setShowAssign(false);
    setBranchId(created.branchId);
    setBranchTab("open");
    setScreen("branch");
    const a = memberById(created.assigneeId);
    const s = memberById(created.supervisorId);
    setToast(
      `Đã giao task cho ${firstName(a?.name ?? "")} · Take care: ${firstName(s?.name ?? "")}`,
    );
  }

  function validateSubmit(form: SubmitForm): SubmitErrors {
    const err: SubmitErrors = {};
    const links = form.links.map((l) => l.trim()).filter(Boolean);
    form.links.forEach((l, i) => {
      const v = l.trim();
      if (v && !isValidHttpUrl(v)) err[`link_${i}`] = "Link không hợp lệ";
    });
    if (links.length === 0 && form.files.length === 0) {
      err.evidence = "Thêm ít nhất 1 link hoặc tệp minh chứng";
    }
    return err;
  }

  async function confirmSubmit() {
    if (!submitTarget) return;
    const err = validateSubmit(submitForm);
    setSubmitErrors(err);
    if (Object.keys(err).length) return;

    const next = await submitTask(submitTarget, {
      links: submitForm.links,
      files: submitForm.files,
      note: submitForm.note,
      actorId: CURRENT_USER.id,
    });
    await notifySupervisor(next.id);
    setTasks((prev) => prev.map((t) => (t.id === next.id ? next : t)));
    setSubmitTaskId(null);
    const s = memberById(next.supervisorId);
    setToast(`Đã nộp, chờ ${s?.name ?? "người duyệt"} duyệt`);
  }

  function validateReview(form: ReviewForm): ReviewErrors {
    const err: ReviewErrors = {};
    if (!form.result) err.result = "Chọn kết quả duyệt";
    if (form.result === "revision" && !form.comment.trim()) {
      err.comment = "Nhập nhận xét cần chỉnh sửa";
    }
    if (form.result === "redo" && !form.comment.trim()) {
      err.comment = "Nhập lý do làm lại";
    }
    if (form.result === "revision" || form.result === "redo") {
      if (form.result === "redo") {
        if (!form.date || !form.time) {
          err.deadline = "Chọn deadline mới";
        } else {
          const due = new Date(`${form.date}T${form.time}:00`);
          if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
            err.deadline = "Deadline phải sau thời điểm hiện tại";
          }
        }
      } else if (form.date && form.time) {
        const due = new Date(`${form.date}T${form.time}:00`);
        if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
          err.deadline = "Deadline phải sau thời điểm hiện tại";
        }
      }
    }
    return err;
  }

  async function confirmReview() {
    if (!reviewTarget) return;
    const err = validateReview(reviewForm);
    setReviewErrors(err);
    if (Object.keys(err).length || !reviewForm.result) return;

    let newDueDate: string | null = null;
    if (
      (reviewForm.result === "revision" || reviewForm.result === "redo") &&
      reviewForm.date &&
      reviewForm.time
    ) {
      newDueDate = new Date(
        `${reviewForm.date}T${reviewForm.time}:00`,
      ).toISOString();
    }

    const next = await reviewTask(reviewTarget, {
      result: reviewForm.result,
      comment: reviewForm.comment,
      reviewedBy: CURRENT_USER.id,
      newDueDate,
    });
    await notifyAssignee(next.id);
    setTasks((prev) => prev.map((t) => (t.id === next.id ? next : t)));
    setReviewTaskId(null);
    const a = memberById(next.assigneeId);
    if (reviewForm.result === "approved") {
      setToast("Đã duyệt hoàn thành");
    } else if (reviewForm.result === "revision") {
      setToast(
        `Đã gửi yêu cầu chỉnh sửa cho ${firstName(a?.name ?? "thành viên")}`,
      );
    } else {
      setToast(`Đã yêu cầu ${firstName(a?.name ?? "thành viên")} làm lại`);
    }
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    const added: EvidenceFile[] = Array.from(list).map((f) => ({
      id: fileId(),
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("image/") ? "image" : "file",
    }));
    setSubmitForm((f) => ({ ...f, files: [...f.files, ...added] }));
    setSubmitErrors((e) => {
      const n = { ...e };
      delete n.evidence;
      return n;
    });
  }

  const portalTarget = frameEl;

  const listForBranchTab =
    branchTab === "open"
      ? branchLists.open
      : branchTab === "submitted"
        ? branchLists.submitted
        : branchTab === "nudge"
          ? branchLists.nudge
          : branchLists.done;

  return (
    <div className="tb-page">
      {screen === "home" ? (
        <>
          <header className="tb-header">
            <div className="tb-header-left">
              <Link href="/" aria-label="Trang chủ">
                <PfcLogo size={32} />
              </Link>
              <div>
                <h1>Công việc</h1>
                <p>
                  {openTasks.length} việc đang mở · {doneTasks.length} đã xong ·{" "}
                  {BRANCHES.length} nhánh
                </p>
              </div>
            </div>
            {allowAssign ? (
              <button
                type="button"
                className="tb-assign-btn"
                onClick={() => openAssign()}
              >
                + Giao task
              </button>
            ) : null}
          </header>

          {nudgeTasks.length > 0 ? (
            <button
              type="button"
              className="tb-alert"
              onClick={() => setScreen("nudge")}
            >
              <span className="tb-alert-ico" aria-hidden>
                ⚠
              </span>
              <span>
                {nudgeTasks.length} việc cần giục – Quá hạn hoặc còn dưới 48 giờ
                mà chưa xong
                {nudgedCount > 0 ? ` · đã giục ${nudgedCount}` : ""}
              </span>
            </button>
          ) : null}

          {pendingReview.length > 0 ? (
            <button
              type="button"
              className="tb-alert review"
              onClick={() => setScreen("review_queue")}
            >
              <span className="tb-alert-ico" aria-hidden>
                ✓
              </span>
              <span>
                {pendingReview.length} việc chờ bạn duyệt
              </span>
            </button>
          ) : null}

          <div className="tb-grid">
            {branchStats.map((s) => (
              <button
                key={s.branch.id}
                type="button"
                className="tb-branch-card"
                onClick={() => openBranch(s.branch.id)}
              >
                {s.overdue > 0 ? (
                  <span className="tb-badge danger">{s.overdue} quá hạn</span>
                ) : s.soon > 0 ? (
                  <span className="tb-badge warn">{s.soon} sắp hạn</span>
                ) : s.waiting > 0 ? (
                  <span className="tb-badge review">
                    {s.waiting} chờ duyệt
                  </span>
                ) : null}
                <span
                  className="tb-branch-ico"
                  style={{ background: s.branch.soft, color: s.branch.color }}
                >
                  {s.branch.icon}
                </span>
                <strong>{s.branch.name}</strong>
                <span className="tb-branch-meta">
                  {s.open} đang mở · {s.done}/{s.total || 0} xong
                </span>
                <span className="tb-branch-bar">
                  <i
                    style={{
                      width: `${s.pct}%`,
                      background: s.branch.color,
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {screen === "branch" && activeBranch ? (
        <>
          <header className="tb-subhead">
            <button
              type="button"
              className="tb-back"
              onClick={() => setScreen("home")}
              aria-label="Quay lại"
            >
              ←
            </button>
            <span
              className="tb-branch-ico sm"
              style={{
                background: activeBranch.soft,
                color: activeBranch.color,
              }}
            >
              {activeBranch.icon}
            </span>
            <div className="tb-subhead-text">
              <h1>{activeBranch.name}</h1>
              <p>
                {branchLists.open.length} đang mở · {branchAssignees} người thực
                hiện
              </p>
            </div>
            {allowAssign ? (
              <button
                type="button"
                className="tb-plus"
                onClick={() => openAssign(activeBranch.id)}
                aria-label="Giao task"
              >
                +
              </button>
            ) : null}
          </header>

          <div className="tb-tabs four" role="tablist">
            {(
              [
                ["open", "Đang mở", branchLists.open.length],
                ["submitted", "Chờ duyệt", branchLists.submitted.length],
                ["nudge", "Cần giục", branchLists.nudge.length],
                ["done", "Đã xong", branchLists.done.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={branchTab === id ? "on" : ""}
                onClick={() => setBranchTab(id)}
              >
                {label} <em>{count}</em>
              </button>
            ))}
          </div>

          <TaskList
            tasks={listForBranchTab}
            now={now}
            showBranch={false}
            onRemind={remind}
            onRemindReview={remindReview}
            onSubmit={openSubmit}
            onReview={openReview}
            onOpenDetail={(t) => {
              setDetailTaskId(t.id);
              setHistoryOpen(true);
            }}
          />
        </>
      ) : null}

      {screen === "nudge" ? (
        <>
          <header className="tb-subhead">
            <button
              type="button"
              className="tb-back"
              onClick={() => setScreen("home")}
              aria-label="Quay lại"
            >
              ←
            </button>
            <div className="tb-subhead-text">
              <h1>Cần giục deadline</h1>
              <p>{nudgeTasks.length} việc trên 6 nhánh</p>
            </div>
          </header>

          {nudgePending.length > 0 ? (
            <button
              type="button"
              className="tb-remind-all"
              onClick={() => void remindAll()}
            >
              Giục tất cả ({nudgePending.length} việc)
            </button>
          ) : null}

          <TaskList
            tasks={nudgeTasks}
            now={now}
            showBranch
            onRemind={remind}
            onRemindReview={remindReview}
            onSubmit={openSubmit}
            onReview={openReview}
            onOpenDetail={(t) => {
              setDetailTaskId(t.id);
              setHistoryOpen(true);
            }}
          />
        </>
      ) : null}

      {screen === "review_queue" ? (
        <>
          <header className="tb-subhead">
            <button
              type="button"
              className="tb-back"
              onClick={() => setScreen("home")}
              aria-label="Quay lại"
            >
              ←
            </button>
            <div className="tb-subhead-text">
              <h1>Chờ bạn duyệt</h1>
              <p>{pendingReview.length} việc từ mọi nhánh</p>
            </div>
          </header>

          <TaskList
            tasks={pendingReview}
            now={now}
            showBranch
            onRemind={remind}
            onRemindReview={remindReview}
            onSubmit={openSubmit}
            onReview={openReview}
            onOpenDetail={(t) => {
              setDetailTaskId(t.id);
              setHistoryOpen(true);
            }}
          />
        </>
      ) : null}

      {portalTarget && toast
        ? createPortal(<div className="tb-toast">{toast}</div>, portalTarget)
        : null}

      {portalTarget && showAssign
        ? createPortal(
            <AssignSheet
              form={assignForm}
              errors={assignErrors}
              onClose={() => setShowAssign(false)}
              onChange={(patch) => {
                setAssignForm((f) => {
                  const next = { ...f, ...patch };
                  if (patch.assigneeId !== undefined) {
                    next.supervisorId =
                      defaultSupervisorForAssignee(patch.assigneeId) ?? "";
                    setAssignErrors((e) => {
                      const n = { ...e };
                      delete n.assigneeId;
                      return n;
                    });
                  }
                  if (patch.title !== undefined) {
                    setAssignErrors((e) => {
                      const n = { ...e };
                      delete n.title;
                      return n;
                    });
                  }
                  if (patch.date !== undefined || patch.time !== undefined) {
                    setAssignErrors((e) => {
                      const n = { ...e };
                      delete n.deadline;
                      return n;
                    });
                  }
                  return next;
                });
              }}
              onSubmit={() => void submitAssign()}
            />,
            portalTarget,
          )
        : null}

      {portalTarget && submitTarget
        ? createPortal(
            <SubmitSheet
              task={submitTarget}
              form={submitForm}
              errors={submitErrors}
              onClose={() => setSubmitTaskId(null)}
              onChange={setSubmitForm}
              onPickFiles={onPickFiles}
              onClearError={(key) =>
                setSubmitErrors((e) => {
                  const n = { ...e };
                  delete n[key];
                  return n;
                })
              }
              onSubmit={() => void confirmSubmit()}
            />,
            portalTarget,
          )
        : null}

      {portalTarget && reviewTarget
        ? createPortal(
            <ReviewSheet
              task={reviewTarget}
              form={reviewForm}
              errors={reviewErrors}
              onClose={() => setReviewTaskId(null)}
              onChange={(patch) => {
                setReviewForm((f) => ({ ...f, ...patch }));
                setReviewErrors((e) => {
                  const n = { ...e };
                  if (patch.result !== undefined) delete n.result;
                  if (patch.comment !== undefined) delete n.comment;
                  if (patch.date !== undefined || patch.time !== undefined) {
                    delete n.deadline;
                  }
                  return n;
                });
              }}
              onSubmit={() => void confirmReview()}
            />,
            portalTarget,
          )
        : null}

      {portalTarget && detailTarget
        ? createPortal(
            <DetailSheet
              task={detailTarget}
              historyOpen={historyOpen}
              onToggleHistory={() => setHistoryOpen((v) => !v)}
              onClose={() => setDetailTaskId(null)}
            />,
            portalTarget,
          )
        : null}
    </div>
  );
}

function TaskList({
  tasks,
  now,
  showBranch,
  onRemind,
  onRemindReview,
  onSubmit,
  onReview,
  onOpenDetail,
}: {
  tasks: Task[];
  now: Date;
  showBranch: boolean;
  onRemind: (t: Task) => void;
  onRemindReview: (t: Task) => void;
  onSubmit: (t: Task) => void;
  onReview: (t: Task) => void;
  onOpenDetail: (t: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="tb-empty">Không có việc nào ở mục này.</p>;
  }
  return (
    <ul className="tb-task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          now={now}
          showBranch={showBranch}
          onRemind={() => onRemind(task)}
          onRemindReview={() => onRemindReview(task)}
          onSubmit={() => onSubmit(task)}
          onReview={() => onReview(task)}
          onOpenDetail={() => onOpenDetail(task)}
        />
      ))}
    </ul>
  );
}

function StatusChip({ task }: { task: Task }) {
  if (
    task.status !== "submitted" &&
    task.status !== "revision" &&
    task.status !== "redo"
  ) {
    return null;
  }
  const comment = latestReviewComment(task);
  return (
    <div className={`tb-status-chip ${task.status}`}>
      <span className="tb-status-label">{statusLabel(task.status)}</span>
      {(task.status === "revision" || task.status === "redo") && comment ? (
        <span className="tb-status-note">“{comment}”</span>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  now,
  showBranch,
  onRemind,
  onRemindReview,
  onSubmit,
  onReview,
  onOpenDetail,
}: {
  task: Task;
  now: Date;
  showBranch: boolean;
  onRemind: () => void;
  onRemindReview: () => void;
  onSubmit: () => void;
  onReview: () => void;
  onOpenDetail: () => void;
}) {
  const assignee = memberById(task.assigneeId);
  const supervisor = memberById(task.supervisorId);
  const dept = assignee ? departmentById(assignee.departmentId) : null;
  const branch = branchById(task.branchId);
  const relative = formatDeadlineRelative(task, now);
  const nudge = needsReminder(task, now);
  const overdue = isOverdue(task, now);
  const done = task.status === "done";
  const reminded = !!task.lastRemindedAt;
  const showSubmit = canSubmit(task, CURRENT_USER);
  const showReview = canReview(task, CURRENT_USER);
  const showReviewNudge = canRemindReview(task, CURRENT_USER);
  const reviewNudged = !!task.lastReviewRemindedAt;

  return (
    <li className={`tb-task${done ? " done" : ""}`}>
      <div className="tb-task-top">
        <div className="tb-task-title-wrap">
          {showBranch ? (
            <span
              className="tb-branch-tag"
              style={{ color: branch.color, background: branch.soft }}
            >
              {branch.short}
            </span>
          ) : null}
          <button
            type="button"
            className={`tb-task-title-btn${done ? " strike" : ""}`}
            onClick={onOpenDetail}
          >
            {task.title}
          </button>
        </div>
        <div className="tb-task-actions">
          {showSubmit ? (
            <button type="button" className="tb-action-btn submit" onClick={onSubmit}>
              Nộp kết quả
            </button>
          ) : null}
          {showReview ? (
            <button type="button" className="tb-action-btn review" onClick={onReview}>
              Duyệt
            </button>
          ) : null}
          {showReviewNudge ? (
            reviewNudged ? (
              <span className="tb-reminded">✓ Đã nhắc duyệt</span>
            ) : (
              <button
                type="button"
                className="tb-remind-btn review"
                onClick={onRemindReview}
              >
                🔔 Nhắc duyệt
              </button>
            )
          ) : null}
          {nudge && !done ? (
            reminded ? (
              <span className="tb-reminded">✓ Đã giục</span>
            ) : (
              <button
                type="button"
                className={`tb-remind-btn${overdue ? " danger" : " warn"}`}
                onClick={onRemind}
              >
                🔔 Giục DL
              </button>
            )
          ) : null}
        </div>
      </div>

      <StatusChip task={task} />

      <div className="tb-task-people">
        <span
          className="tb-avatar"
          style={{
            background: dept?.soft ?? "#f5f3ff",
            color: dept?.color ?? "#7c3aed",
          }}
        >
          {assignee?.initials ?? "?"}
        </span>
        <span className="tb-name">{firstName(assignee?.name ?? "—")}</span>
        {dept ? (
          <span
            className="tb-dept-tag"
            style={{ color: dept.color, background: dept.soft }}
          >
            {dept.name}
          </span>
        ) : null}
      </div>

      <p className="tb-care">
        <span aria-hidden>🛡</span> Take care: {supervisor?.name ?? "—"} ·{" "}
        {supervisor?.role ?? ""}
      </p>

      <div className="tb-task-foot">
        <span>
          <span aria-hidden>📅</span> {formatDeadlineFull(task.dueDate)}
        </span>
        <em className={`tone-${relative.tone}`}>{relative.text}</em>
      </div>
    </li>
  );
}

function AssignSheet({
  form,
  errors,
  onClose,
  onChange,
  onSubmit,
}: {
  form: AssignForm;
  errors: AssignErrors;
  onClose: () => void;
  onChange: (patch: Partial<AssignForm>) => void;
  onSubmit: () => void;
}) {
  const preview =
    form.date && form.time
      ? formatDeadlineFull(`${form.date}T${form.time}:00`)
      : null;
  const lockedCare = !form.assigneeId;

  return (
    <div className="tb-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tb-sheet"
        role="dialog"
        aria-label="Giao task mới"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Giao task mới</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>

        <label className="tb-field">
          Tên task
          <input
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Thiết kế poster Career Talk"
          />
          {errors.title ? <span className="tb-err">{errors.title}</span> : null}
        </label>

        <label className="tb-field">
          Nhánh
          <select
            value={form.branchId}
            onChange={(e) =>
              onChange({ branchId: e.target.value as BranchId })
            }
          >
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="tb-field">
          Người thực hiện
          <select
            value={form.assigneeId}
            onChange={(e) => onChange({ assigneeId: e.target.value })}
          >
            <option value="">Chọn người thực hiện</option>
            {DEPARTMENTS.map((d) => (
              <optgroup key={d.id} label={d.name}>
                {MEMBERS.filter((m) => m.departmentId === d.id).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.role}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.assigneeId ? (
            <span className="tb-err">{errors.assigneeId}</span>
          ) : null}
        </label>

        <label className="tb-field">
          Take care
          <select
            value={form.supervisorId}
            disabled={lockedCare}
            onChange={(e) => onChange({ supervisorId: e.target.value })}
          >
            {lockedCare ? (
              <option value="">Chọn người thực hiện trước</option>
            ) : (
              supervisors().map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.role} ({departmentById(m.departmentId)?.name})
                </option>
              ))
            )}
          </select>
        </label>

        <div className="tb-row2">
          <label className="tb-field">
            Ngày deadline
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange({ date: e.target.value })}
            />
          </label>
          <label className="tb-field">
            Giờ
            <input
              type="time"
              value={form.time}
              onChange={(e) => onChange({ time: e.target.value })}
            />
          </label>
        </div>
        {errors.deadline ? (
          <span className="tb-err block">{errors.deadline}</span>
        ) : null}
        {preview && !errors.deadline ? (
          <p className="tb-preview">{preview}</p>
        ) : null}

        <div className="tb-field">
          <span>Mức ưu tiên</span>
          <div className="tb-prio">
            {(
              [
                ["low", "Thấp"],
                ["medium", "Trung bình"],
                ["high", "Cao"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={form.priority === id ? "on" : ""}
                onClick={() => onChange({ priority: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="tb-field">
          Ghi chú
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Link tài liệu, yêu cầu cụ thể"
          />
        </label>

        <div className="tb-sheet-actions">
          <button type="button" className="tb-btn ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="tb-btn primary" onClick={onSubmit}>
            ↗ Giao task
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitSheet({
  task,
  form,
  errors,
  onClose,
  onChange,
  onPickFiles,
  onClearError,
  onSubmit,
}: {
  task: Task;
  form: SubmitForm;
  errors: SubmitErrors;
  onClose: () => void;
  onChange: (next: SubmitForm) => void;
  onPickFiles: (files: FileList | null) => void;
  onClearError: (key: keyof SubmitErrors) => void;
  onSubmit: () => void;
}) {
  const prev = latestReviewComment(task);
  const showPrev = task.status === "revision" || task.status === "redo";

  return (
    <div className="tb-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tb-sheet tall"
        role="dialog"
        aria-label="Nộp kết quả"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Nộp kết quả</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>

        <div className="tb-sheet-meta">
          <strong>{task.title}</strong>
          <span>Deadline: {formatDeadlineFull(task.dueDate)}</span>
        </div>

        {showPrev && prev ? (
          <div className={`tb-prev-review ${task.status}`}>
            <strong>
              {task.status === "revision"
                ? "Nhận xét lần duyệt trước"
                : "Lý do làm lại"}
            </strong>
            <p>{prev}</p>
          </div>
        ) : null}

        <div className="tb-field">
          <span>Link minh chứng</span>
          {form.links.map((link, i) => (
            <div key={i} className="tb-link-row">
              <input
                value={link}
                placeholder="https://..."
                onChange={(e) => {
                  const links = [...form.links];
                  links[i] = e.target.value;
                  onChange({ ...form, links });
                  onClearError(`link_${i}`);
                  onClearError("evidence");
                }}
              />
              {form.links.length > 1 ? (
                <button
                  type="button"
                  className="tb-x"
                  aria-label="Xoá link"
                  onClick={() => {
                    const links = form.links.filter((_, j) => j !== i);
                    onChange({ ...form, links: links.length ? links : [""] });
                  }}
                >
                  ✕
                </button>
              ) : null}
              {errors[`link_${i}`] ? (
                <span className="tb-err">{errors[`link_${i}`]}</span>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="tb-add-link"
            onClick={() => onChange({ ...form, links: [...form.links, ""] })}
          >
            + Thêm link
          </button>
        </div>

        <div className="tb-field">
          <span>Tệp / ảnh minh chứng</span>
          <label className="tb-upload">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.zip"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            Tải lên ảnh hoặc file
          </label>
          {form.files.length > 0 ? (
            <ul className="tb-file-list">
              {form.files.map((f) => (
                <li key={f.id}>
                  {f.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt="" className="tb-thumb" />
                  ) : (
                    <span className="tb-file-ico">📄</span>
                  )}
                  <span className="tb-file-name">{f.name}</span>
                  <button
                    type="button"
                    className="tb-x"
                    aria-label="Xoá tệp"
                    onClick={() =>
                      onChange({
                        ...form,
                        files: form.files.filter((x) => x.id !== f.id),
                      })
                    }
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {errors.evidence ? (
          <span className="tb-err block">{errors.evidence}</span>
        ) : null}

        <label className="tb-field">
          Ghi chú cho người duyệt
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => onChange({ ...form, note: e.target.value })}
            placeholder="Mô tả ngắn những gì đã làm"
          />
        </label>

        <div className="tb-sheet-actions">
          <button type="button" className="tb-btn ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="tb-btn primary" onClick={onSubmit}>
            Nộp để duyệt
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewSheet({
  task,
  form,
  errors,
  onClose,
  onChange,
  onSubmit,
}: {
  task: Task;
  form: ReviewForm;
  errors: ReviewErrors;
  onClose: () => void;
  onChange: (patch: Partial<ReviewForm>) => void;
  onSubmit: () => void;
}) {
  const assignee = memberById(task.assigneeId);
  const dept = assignee ? departmentById(assignee.departmentId) : null;
  const last = task.submissions[task.submissions.length - 1];
  const older = task.submissions.slice(0, -1).reverse();
  const [showOlder, setShowOlder] = useState(false);

  const lateOk = last
    ? new Date(last.submittedAt).getTime() <= new Date(task.dueDate).getTime()
    : true;
  const lateText =
    last && !lateOk
      ? last.lateLabel ||
        formatLateDuration(task.dueDate, last.submittedAt)
      : null;

  const needDeadline =
    form.result === "revision" || form.result === "redo";

  return (
    <div className="tb-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tb-sheet tall"
        role="dialog"
        aria-label="Duyệt kết quả"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Duyệt kết quả</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>

        <div className="tb-sheet-meta">
          <strong>{task.title}</strong>
          <span>
            {assignee?.name ?? "—"}
            {dept ? ` · ${dept.name}` : ""}
          </span>
          <span>Deadline: {formatDeadlineFull(task.dueDate)}</span>
          {last ? (
            <span>
              Nộp lúc: {formatDeadlineFull(last.submittedAt)}{" "}
              {lateOk ? (
                <em className="tb-late-tag ok">Đúng hạn</em>
              ) : (
                <em className="tb-late-tag late">{lateText}</em>
              )}
            </span>
          ) : null}
        </div>

        {last ? <SubmissionBlock sub={last} /> : null}

        {older.length > 0 ? (
          <div className="tb-older">
            <button
              type="button"
              className="tb-older-toggle"
              onClick={() => setShowOlder((v) => !v)}
            >
              {showOlder ? "▾" : "▸"} Lịch sử các lần nộp trước ({older.length})
            </button>
            {showOlder
              ? older.map((s) => <SubmissionBlock key={s.id} sub={s} compact />)
              : null}
          </div>
        ) : null}

        <div className="tb-field">
          <span>Kết quả duyệt</span>
          <div className="tb-review-choices">
            {(
              [
                ["approved", "Đạt – Hoàn thành", "ok"],
                ["revision", "Cần chỉnh sửa", "rev"],
                ["redo", "Làm lại", "redo"],
              ] as const
            ).map(([id, label, cls]) => (
              <button
                key={id}
                type="button"
                className={`tb-review-choice ${cls}${form.result === id ? " on" : ""}`}
                onClick={() => {
                  if (id === "revision") {
                    onChange({ result: id, date: "", time: "" });
                  } else if (id === "redo") {
                    const d = new Date();
                    d.setMinutes(0, 0, 0);
                    d.setHours(d.getHours() + 48);
                    onChange({
                      result: id,
                      date: d.toISOString().slice(0, 10),
                      time: d.toTimeString().slice(0, 5),
                    });
                  } else {
                    onChange({ result: id });
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.result ? (
            <span className="tb-err">{errors.result}</span>
          ) : null}
        </div>

        <label className="tb-field">
          Nhận xét
          <textarea
            rows={3}
            value={form.comment}
            onChange={(e) => onChange({ comment: e.target.value })}
            placeholder={
              form.result === "redo"
                ? "Lý do chưa đạt và yêu cầu làm lại"
                : form.result === "revision"
                  ? "Cần hoàn thiện phần nào?"
                  : "Không bắt buộc với Đạt"
            }
          />
          {errors.comment ? (
            <span className="tb-err">{errors.comment}</span>
          ) : null}
        </label>

        {needDeadline ? (
          <>
            <div className="tb-row2">
              <label className="tb-field">
                Deadline mới
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => onChange({ date: e.target.value })}
                />
              </label>
              <label className="tb-field">
                Giờ
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => onChange({ time: e.target.value })}
                />
              </label>
            </div>
            {form.result === "revision" ? (
              <p className="tb-hint">Để trống thì giữ deadline cũ</p>
            ) : null}
            {errors.deadline ? (
              <span className="tb-err block">{errors.deadline}</span>
            ) : null}
          </>
        ) : null}

        <div className="tb-sheet-actions">
          <button type="button" className="tb-btn ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="tb-btn primary" onClick={onSubmit}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionBlock({
  sub,
  compact,
}: {
  sub: Submission;
  compact?: boolean;
}) {
  return (
    <div className={`tb-sub-block${compact ? " compact" : ""}`}>
      {compact ? (
        <p className="tb-sub-when">{formatDeadlineFull(sub.submittedAt)}</p>
      ) : null}
      {sub.links.length > 0 ? (
        <ul className="tb-link-list">
          {sub.links.map((l) => (
            <li key={l}>
              <a href={l} target="_blank" rel="noreferrer">
                {l}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {sub.files.length > 0 ? (
        <ul className="tb-file-list view">
          {sub.files.map((f) => (
            <li key={f.id}>
              {f.type === "image" ? (
                <a href={f.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.name} className="tb-thumb lg" />
                </a>
              ) : (
                <a href={f.url} target="_blank" rel="noreferrer">
                  📄 {f.name}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {sub.note ? <p className="tb-sub-note">{sub.note}</p> : null}
      {sub.review ? (
        <p className="tb-sub-review">
          Đã duyệt: {statusLabel(
            sub.review.result === "approved" ? "done" : sub.review.result,
          )}
          {sub.review.comment ? ` — ${sub.review.comment}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function DetailSheet({
  task,
  historyOpen,
  onToggleHistory,
  onClose,
}: {
  task: Task;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onClose: () => void;
}) {
  const assignee = memberById(task.assigneeId);
  const supervisor = memberById(task.supervisorId);
  const events = [...task.history].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return (
    <div className="tb-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tb-sheet tall"
        role="dialog"
        aria-label="Chi tiết task"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Chi tiết task</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>

        <div className="tb-sheet-meta">
          <strong>{task.title}</strong>
          <StatusChip task={task} />
          <span>
            Thực hiện: {assignee?.name ?? "—"} · Take care:{" "}
            {supervisor?.name ?? "—"}
          </span>
          <span>Deadline: {formatDeadlineFull(task.dueDate)}</span>
          {task.note ? <span>Ghi chú: {task.note}</span> : null}
        </div>

        <div className="tb-history">
          <button
            type="button"
            className="tb-older-toggle"
            onClick={onToggleHistory}
          >
            {historyOpen ? "▾" : "▸"} Lịch sử
          </button>
          {historyOpen ? (
            <ol className="tb-timeline">
              {events.map((ev) => {
                const actor = memberById(ev.actorId);
                const style = historyIcon(ev.type);
                return (
                  <li key={ev.id}>
                    <span
                      className="tb-tl-dot"
                      style={{ background: style.color }}
                      aria-hidden
                    >
                      {style.icon}
                    </span>
                    <div>
                      <strong>{ev.message.split(" — ")[0]}</strong>
                      <span>
                        {actor?.name ?? "—"}
                        {ev.message.includes(" — ")
                          ? ` — “${ev.message.split(" — ").slice(1).join(" — ")}”`
                          : ""}
                      </span>
                      <em>{formatDeadlineFull(ev.at)}</em>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  );
}
