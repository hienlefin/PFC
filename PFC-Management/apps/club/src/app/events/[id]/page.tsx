"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";
import { probeEventHub } from "@/lib/event-hub-client";
import {
  isDirectVideo,
  renderMarkdown,
  videoEmbedSrc,
} from "@/lib/markdown";

type ActivityDetail = {
  id: string;
  title: string;
  status: string;
  kind: "internal" | "linked";
  location: string | null;
  mode: string;
  coverUrl: string | null;
  bodyMd: string;
  videoUrl: string | null;
  mediaUrls?: string[];
  videoEmbeds?: string[];
  capacity?: number | null;
  registerDeadline?: string | Date | null;
  hostTeamId?: string | null;
  cta: { register?: boolean; btc?: boolean; checkin?: boolean };
  externalEventId: string | null;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  participantCount: number;
  joined: boolean;
};

function fmt(d: string | Date | null | undefined) {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

export default function ActivityDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { data, can, post, error: authError } = useClubData();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const canEdit =
    can("manage_activities") ||
    (activity?.kind === "linked" && can("link_events"));
  const canCheckIn = can("link_events");
  const hostTeam = data?.teams?.find((t) => t.id === activity?.hostTeamId);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/club?action=activity&activityId=${encodeURIComponent(id)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Không tải được");
        if (!cancelled) setActivity(json.activity as ActivityDetail);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Lỗi");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function join() {
    try {
      await post({ action: "join_activity", activityId: id });
      setToast("Đã đăng ký tham gia");
      setActivity((a) =>
        a
          ? {
              ...a,
              joined: true,
              participantCount: a.participantCount + (a.joined ? 0 : 1),
            }
          : a,
      );
    } catch (e) {
      setToast(
        e instanceof Error
          ? e.message
          : "Bạn không có quyền thực hiện thao tác này",
      );
    }
  }

  async function openHub(path: "register" | "checkIn") {
    const ext = activity?.externalEventId;
    if (!ext) {
      setToast("Chưa gắn Shared Event Hub.");
      return;
    }
    const base = "http://127.0.0.1:3100";
    const url =
      path === "register"
        ? `${base}/events/${ext}/register`
        : `${base}/events/${ext}/check-in`;
    const ok = await probeEventHub(url);
    if (ok) window.open(url, "_blank", "noopener,noreferrer");
    else setToast("Shared Event Hub offline — thử lại sau.");
  }

  const start = fmt(activity?.startsAt);
  const end = fmt(activity?.endsAt);
  const deadline = fmt(activity?.registerDeadline);
  const media =
    activity?.mediaUrls?.length
      ? activity.mediaUrls
      : activity?.coverUrl
        ? [activity.coverUrl]
        : [];
  const videos =
    activity?.videoEmbeds?.length
      ? activity.videoEmbeds
      : activity?.videoUrl
        ? [activity.videoUrl]
        : [];

  return (
    <>
      <AppHeader title="Chi tiết" />
      {(authError || error) && (
        <div className="error-banner">{authError || error}</div>
      )}
      {!activity && !error && <p className="muted">Đang tải…</p>}
      {activity && (
        <article className="event-post">
          {media[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media[0]} alt="" className="event-post-cover" />
          )}
          <div className="event-post-meta">
            <span className="badge">
              {activity.kind === "linked" ? "Liên kết Hub" : "Nội bộ"}
            </span>
            <span className="badge">{activity.mode}</span>
            <span className="badge">{activity.status}</span>
            {hostTeam && <span className="badge">{hostTeam.name}</span>}
          </div>
          <h1 className="event-post-title">{activity.title}</h1>
          {(start || end || activity.location) && (
            <p className="muted" style={{ marginTop: 0 }}>
              {start}
              {end ? ` → ${end}` : ""}
              {activity.location ? ` · ${activity.location}` : ""}
            </p>
          )}
          {(deadline || activity.capacity != null) && (
            <p className="muted" style={{ fontSize: 13 }}>
              {deadline ? `Hạn ĐK: ${deadline}` : null}
              {deadline && activity.capacity != null ? " · " : null}
              {activity.capacity != null
                ? `${activity.participantCount}/${activity.capacity} chỗ`
                : null}
            </p>
          )}

          {media.length > 1 && (
            <div className="media-grid" style={{ marginBottom: 12 }}>
              {media.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url.slice(0, 40)} src={url} alt="" className="media-thumb-static" />
              ))}
            </div>
          )}

          {videos.map((v) => {
            const embed = videoEmbedSrc(v);
            if (embed) {
              return (
                <div key={v} className="video-embed">
                  <iframe
                    src={embed}
                    title="Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }
            if (isDirectVideo(v)) {
              return (
                <video
                  key={v}
                  className="video-direct"
                  src={v}
                  controls
                  playsInline
                />
              );
            }
            return null;
          })}

          <div
            className="md-body"
            dangerouslySetInnerHTML={{
              __html: looksLikeHtml(activity.bodyMd)
                ? activity.bodyMd
                : renderMarkdown(activity.bodyMd),
            }}
          />

          <div className="event-post-cta">
            {activity.cta?.register !== false &&
              (activity.kind === "linked" ? (
                <button
                  type="button"
                  className="btn-primary solid"
                  onClick={() => void openHub("register")}
                >
                  Đăng ký tham gia (Hub)
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary solid"
                  disabled={activity.joined || activity.status !== "active"}
                  onClick={() => void join()}
                >
                  {activity.joined
                    ? "Đã đăng ký"
                    : `Đăng ký tham gia (${activity.participantCount})`}
                </button>
              ))}
            {activity.cta?.btc && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setToast(
                    activity.kind === "linked"
                      ? "Đăng ký BTC qua Ban tổ chức trên Hub / liên hệ Trưởng ban."
                      : "Đã ghi nhận quan tâm BTC — Ban điều hành sẽ liên hệ.",
                  )
                }
              >
                Đăng ký làm BTC
              </button>
            )}
            {activity.cta?.checkin && canCheckIn && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void openHub("checkIn")}
              >
                Check-in QR
              </button>
            )}
          </div>

          {canEdit && (
            <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
              <Link href={`/events/create?edit=${activity.id}`}>Sửa bài đăng</Link>
              {" · "}
              <Link href="/events">Quay lại danh sách</Link>
            </p>
          )}
        </article>
      )}
      {toast && (
        <div className="toast-fixed" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
