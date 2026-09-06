"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader, StatusBar } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

const COL_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Cần làm",
  in_progress: "Đang làm",
  review: "Review",
  done: "Hoàn thành",
};

export default function TasksPage() {
  const { data, error, post } = useClubData();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"board" | "timeline">("board");
  const kanban = data?.kanban ?? {};

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    await post({ action: "create_task", title, priority: "medium" });
    setTitle("");
  }

  return (
    <>
      <StatusBar />
      <AppHeader title="Công việc" />
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

      <form onSubmit={addTask} className="section" style={{ display: "flex", gap: 8 }}>
        <input
          style={{
            flex: 1,
            border: "1px solid var(--pfc-border)",
            borderRadius: 12,
            padding: "12px 14px",
          }}
          placeholder="Thêm công việc mới..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button className="btn-primary solid" style={{ width: "auto" }}>
          Thêm
        </button>
      </form>

      {mode === "board" ? (
        <div
          className="section"
          style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}
        >
          {Object.entries(kanban).map(([col, items]) => (
            <div key={col} className="kanban-col">
              <h4>
                {COL_LABEL[col] ?? col} ({items.length})
              </h4>
              {items.map((t) => (
                <div key={t.id} className="task-card">
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {t.priority}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {col === "backlog" && (
                      <button className="btn-ghost" onClick={() => post({ action: "task_transition", taskId: t.id, to: "todo" })}>
                        → Cần làm
                      </button>
                    )}
                    {col === "todo" && (
                      <button className="btn-ghost" onClick={() => post({ action: "task_transition", taskId: t.id, to: "in_progress" })}>
                        → Đang làm
                      </button>
                    )}
                    {col === "in_progress" && (
                      <button className="btn-ghost" onClick={() => post({ action: "task_transition", taskId: t.id, to: "review" })}>
                        → Review
                      </button>
                    )}
                    {col === "review" && (
                      <button className="btn-ghost" onClick={() => post({ action: "task_transition", taskId: t.id, to: "done" })}>
                        → Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <section className="section">
          {(data?.timeline ?? []).map((t) => (
            <div key={t.id} className="list-row">
              <div className="avatar">📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                <div className="muted">
                  {t.status} ·{" "}
                  {t.deadline
                    ? new Date(t.deadline).toLocaleDateString("vi-VN")
                    : "Chưa có hạn"}
                </div>
              </div>
            </div>
          ))}
          {!data?.timeline?.length && (
            <p className="muted">Chưa có task có deadline.</p>
          )}
        </section>
      )}
    </>
  );
}
