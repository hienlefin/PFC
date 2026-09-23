"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";
import { EventFeedCard, type FeedCardModel } from "@/components/EventFeedCard";
import { QrBlock } from "@/components/QrBlock";
import {
  displayEventTitle,
  getLocalDemoTicket,
  importHubTicketFromQuery,
  issueLocalDemoTicket,
  listLocalDemoTickets,
  probeEventHub,
  type LocalDemoTicket,
} from "@/lib/event-hub-client";

type Chip = "upcoming" | "online" | "offline" | "mine";

type HubModal = {
  eventId: string;
  title: string;
  intent: "register" | "ticket" | "myTicket";
  hubUrl: string;
};

const INTENT_LABEL: Record<HubModal["intent"], string> = {
  register: "đăng ký",
  ticket: "mua vé",
  myTicket: "vé của tôi",
};

function plainSummary(raw?: string | null, max = 120): string | null {
  if (!raw?.trim()) return null;
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function EventsPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { data, error, can } = useClubData();
  const [chip, setChip] = useState<Chip>("upcoming");
  const [hubOk, setHubOk] = useState<boolean | null>(null);
  const [modal, setModal] = useState<HubModal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [localTickets, setLocalTickets] = useState<LocalDemoTicket[]>([]);
  const [simTicket, setSimTicket] = useState<LocalDemoTicket | null>(null);

  const links = data?.links ?? [];
  const activities = data?.activities ?? [];
  const canCreatePost = can("manage_activities") || can("link_events");

  const refreshLocal = useCallback(() => {
    setLocalTickets(listLocalDemoTickets());
  }, []);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    const raw = search.get("hubTicket");
    if (!raw) return;
    const imported = importHubTicketFromQuery(raw);
    if (imported) {
      refreshLocal();
      setChip("mine");
      setToast(`Đã đồng bộ vé từ Event Hub — ${imported.code}.`);
      router.replace("/events", { scroll: false });
    }
  }, [search, refreshLocal, router]);

  useEffect(() => {
    const sample =
      links[0]?.event?.registerUrl ||
      links[0]?.event?.ticketUrl ||
      "http://127.0.0.1:3100";
    let cancelled = false;
    void probeEventHub(sample).then((ok) => {
      if (!cancelled) setHubOk(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [links]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibleLinks = links.filter((l) => {
    if (chip === "upcoming" || chip === "mine") return true;
    const mode = l.event?.mode;
    if (chip === "online") return mode === "online" || mode === "hybrid";
    if (chip === "offline") return mode === "offline" || mode === "hybrid";
    return true;
  });

  async function openHubAction(
    intent: HubModal["intent"],
    eventId: string,
    title: string,
    hubUrl: string,
  ) {
    if (!hubUrl || hubUrl === "#") {
      setToast("Chưa có deep-link Event Hub cho sự kiện này.");
      return;
    }
    setToast("Đang kiểm tra Shared Event Hub…");
    const ok = await probeEventHub(hubUrl);
    setHubOk(ok);
    setToast(null);
    if (ok) {
      window.open(hubUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setModal({ eventId, title, intent, hubUrl });
  }

  function simulateRegister() {
    if (!modal) return;
    const ticket = issueLocalDemoTicket({
      eventId: modal.eventId,
      title: modal.title,
      hubUrl: modal.hubUrl,
      fullName: "Nguyễn Đức Tuấn",
      status: "Đã xác nhận",
    });
    setSimTicket(ticket);
    refreshLocal();
    setToast("Đã mô phỏng đăng ký — vé demo lưu trong App CLB.");
    setChip("mine");
  }

  const feedCards: FeedCardModel[] = useMemo(() => {
    if (chip === "mine") return [];
    return visibleLinks.map((l) => {
      const ev = l.event;
      const title = displayEventTitle(
        l.externalEventId,
        ev?.title,
        l.label,
      );
      const hasLocal = !!getLocalDemoTicket(l.externalEventId);
      return {
        id: l.id,
        title,
        summary:
          ev?.summary ||
          plainSummary(l.label) ||
          "Sự kiện liên kết từ Shared Event Hub — đăng ký để nhận vé.",
        coverUrl: ev?.coverUrl ?? null,
        mode: ev?.mode,
        location: ev?.location ?? null,
        startsAt: ev?.startsAt ?? null,
        endsAt: ev?.endsAt ?? null,
        capacity: ev?.capacity ?? null,
        registeredCount: ev?.registeredCount ?? null,
        hasTicket: hasLocal,
        kindLabel: "Công khai",
        primaryAction: hasLocal
          ? {
              label: "✅ Đã đăng ký (Xem vé)",
              variant: "secondary" as const,
              onClick: () => {
                setChip("mine");
                refreshLocal();
              },
            }
          : {
              label: "✨ Đăng ký tham gia ngay",
              variant: "primary" as const,
              onClick: () =>
                void openHubAction(
                  "register",
                  l.externalEventId,
                  title,
                  ev?.registerUrl ?? "#",
                ),
            },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openHubAction is stable enough for UI
  }, [chip, visibleLinks, localTickets, refreshLocal]);

  const activityCards: FeedCardModel[] = useMemo(() => {
    return activities
      .filter((a) => {
        if (chip === "mine") return false;
        if (chip === "online")
          return a.mode === "online" || a.mode === "hybrid";
        if (chip === "offline")
          return a.mode === "offline" || a.mode === "hybrid" || !a.mode;
        return true;
      })
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary:
          plainSummary(a.description) ||
          plainSummary(a.bodyMd) ||
          null,
        coverUrl: a.coverUrl ?? null,
        mode: a.mode,
        location: a.location ?? null,
        startsAt: a.startsAt ?? null,
        endsAt: a.endsAt ?? null,
        capacity: a.capacity ?? null,
        registeredCount: a.participantCount ?? null,
        hasTicket: false,
        kindLabel: a.kind === "linked" ? "Liên kết Hub" : "Nội bộ",
        href: `/events/${a.id}`,
        primaryAction: {
          label: "✨ Xem chi tiết & đăng ký",
          href: `/events/${a.id}`,
        },
      }));
  }, [activities, chip]);

  const mineCards = useMemo(() => {
    if (chip !== "mine") return [];
    return visibleLinks.map((l) => {
      const local = getLocalDemoTicket(l.externalEventId);
      return { link: l, local };
    });
  }, [chip, visibleLinks, localTickets]);

  return (
    <>
      <AppHeader title="Sự kiện" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      {canCreatePost && (
        <div style={{ padding: "0 16px 8px" }}>
          <Link
            href="/events/create"
            className="btn-primary solid"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Tạo Sự kiện mới
          </Link>
        </div>
      )}

      {hubOk === false && (
        <div
          className="error-banner"
          style={{
            background: "#fff7ed",
            color: "#9a3412",
            borderColor: "#fed7aa",
          }}
        >
          Shared Event Hub tạm ngưng kết nối — vẫn xem được sự kiện & mô phỏng
          đăng ký trong App.
        </div>
      )}

      <div className="chips">
        {(
          [
            ["upcoming", "Sắp tới"],
            ["online", "Online"],
            ["offline", "Offline"],
            [
              "mine",
              `Vé của tôi${localTickets.length ? ` (${localTickets.length})` : ""}`,
            ],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`chip${chip === key ? " active" : ""}`}
            onClick={() => {
              setChip(key);
              if (key === "mine") refreshLocal();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {chip === "mine" ? (
        <section className="section">
          <div className="section-title">
            <h3>Vé của tôi</h3>
          </div>
          {mineCards.map(({ link: l, local }) => {
            const ev = l.event;
            const title = displayEventTitle(
              l.externalEventId,
              ev?.title,
              l.label,
            );
            const myTicket = local?.studentId
              ? `${local.studentId}|${l.externalEventId}`
              : local
                ? `club-demo://${l.externalEventId}/${local.code}`
                : (ev?.myTicketUrl ?? "#");
            return (
              <article key={l.id} className="evt-card evt-card-ticket">
                <div className="evt-body">
                  <h3 className="evt-title">{title}</h3>
                  {local ? (
                    <>
                      <p className="evt-summary">
                        {local.fullName ? `${local.fullName} · ` : ""}
                        {local.status || "Đã xác nhận"}
                      </p>
                      <p className="evt-ticket-code">{local.code}</p>
                      <span className="evt-badge ticket">🎟️ Đã có vé</span>
                      <QrBlock
                        value={myTicket}
                        size={140}
                        label="QR vé"
                      />
                    </>
                  ) : (
                    <>
                      <p className="evt-summary">
                        Chưa có vé — đăng ký trên Hub rồi quay lại để đồng bộ.
                      </p>
                      <button
                        type="button"
                        className="btn-primary solid evt-cta"
                        onClick={() =>
                          void openHubAction(
                            "myTicket",
                            l.externalEventId,
                            title,
                            ev?.myTicketUrl ?? "#",
                          )
                        }
                      >
                        Mở vé trên Event Hub
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {!mineCards.length && (
            <p className="muted">Chưa có sự kiện trong danh sách vé.</p>
          )}
        </section>
      ) : (
        <>
          <section className="section">
            <div className="section-title">
              <h3>Sự kiện nổi bật</h3>
            </div>
            {feedCards.map((card) => (
              <EventFeedCard key={card.id} card={card} />
            ))}
            {!feedCards.length && (
              <p className="muted">Chưa có sự kiện Hub khớp bộ lọc.</p>
            )}
          </section>

          <section className="section" id="hoat-dong">
            <div className="section-title">
              <h3>Hoạt động nội bộ</h3>
            </div>
            {activityCards.map((card) => (
              <EventFeedCard key={card.id} card={card} />
            ))}
            {!activityCards.length && (
              <p className="muted">Chưa có bài đăng hoạt động.</p>
            )}
          </section>
        </>
      )}

      {toast && (
        <div className="toast-fixed" role="status">
          {toast}
        </div>
      )}

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="evt-modal-backdrop"
          onClick={() => {
            setModal(null);
            setSimTicket(null);
          }}
        >
          <div
            className="card evt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
              Shared Event Hub tạm ngưng
            </h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Tính năng {INTENT_LABEL[modal.intent]} qua Hub đang tạm ngưng kết
              nối.
            </p>
            {!simTicket ? (
              <>
                <button
                  type="button"
                  className="btn-primary solid"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={simulateRegister}
                >
                  Mô phỏng Đăng ký thành công
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => {
                    setModal(null);
                    setSimTicket(null);
                  }}
                >
                  Đóng
                </button>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 700 }}>{simTicket.code}</p>
                <QrBlock
                  value={`club-demo://${simTicket.eventId}/${simTicket.code}`}
                  size={160}
                  label="QR Ticket demo"
                />
                <button
                  type="button"
                  className="btn-primary solid"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setModal(null);
                    setSimTicket(null);
                    setChip("mine");
                  }}
                >
                  Xem trong Vé của tôi
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải...</p>}>
      <EventsPageInner />
    </Suspense>
  );
}
