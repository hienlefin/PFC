"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";
import {
  RichEventEditor,
  type RichEventDraft,
} from "@/components/RichEventEditor";

function toLocalInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function CreateEventInner() {
  const search = useSearchParams();
  const editId = search.get("edit");
  const { data, error, post, can, loading } = useClubData();
  const canManage = can("manage_activities");
  const canLink = can("link_events");
  const teams = data?.teams ?? [];
  const [initial, setInitial] = useState<Partial<RichEventDraft> | undefined>();
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/club?action=activity&activityId=${encodeURIComponent(editId)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Không tải được");
        const a = json.activity;
        if (cancelled) return;
        const mediaAll: string[] = Array.isArray(a.mediaUrls)
          ? a.mediaUrls
          : a.coverUrl
            ? [a.coverUrl]
            : [];
        const cover = a.coverUrl || mediaAll[0] || "";
        const gallery = mediaAll.filter((u: string) => u && u !== cover);
        const videoEmbeds: string[] = Array.isArray(a.videoEmbeds)
          ? a.videoEmbeds
          : a.videoUrl
            ? [a.videoUrl]
            : [""];
        setInitial({
          title: a.title,
          kind: a.kind === "linked" ? "linked" : "internal",
          mode: a.mode === "online" || a.mode === "hybrid" ? a.mode : "offline",
          location: a.location ?? "",
          startsAt: toLocalInput(a.startsAt),
          endsAt: toLocalInput(a.endsAt),
          registerDeadline: toLocalInput(a.registerDeadline),
          capacity: a.capacity != null ? String(a.capacity) : "",
          hostTeamId: a.hostTeamId ?? "",
          coverUrl: cover,
          mediaUrls: gallery,
          videoEmbeds: videoEmbeds.length ? videoEmbeds : [""],
          bodyMd: a.bodyMd ?? "",
          externalEventId: a.externalEventId ?? "",
          ctaRegister: a.cta?.register !== false,
          ctaBtc: !!a.cta?.btc,
          ctaCheckin: !!a.cta?.checkin,
          publish: a.status === "active",
        });
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Lỗi tải");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  async function submit(draft: RichEventDraft) {
    const payload = {
      title: draft.title.trim(),
      kind: draft.kind,
      mode: draft.mode,
      location: draft.location.trim() || null,
      bodyMd: draft.bodyMd,
      mediaUrls: draft.mediaUrls,
      videoEmbeds: draft.videoEmbeds,
      coverUrl: draft.coverUrl.trim() || null,
      capacity: draft.capacity.trim() ? Number(draft.capacity) : null,
      registerDeadline: draft.registerDeadline
        ? new Date(draft.registerDeadline).toISOString()
        : null,
      hostTeamId: draft.hostTeamId || null,
      externalEventId:
        draft.kind === "linked" ? draft.externalEventId.trim() : null,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
      cta: {
        register: draft.ctaRegister,
        btc: draft.ctaBtc,
        checkin: draft.ctaCheckin,
      },
    };
    if (editId) {
      await post({ action: "update_activity", activityId: editId, ...payload });
      return;
    }
    await post({
      action: "create_activity",
      ...payload,
      publish: draft.publish,
    });
  }

  return (
    <>
      <AppHeader title={editId ? "Sửa sự kiện" : "Tạo sự kiện"} />
      {(error || loadErr) && (
        <div className="error-banner">
          {error || loadErr}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}
      {loading || (editId && !initial && !loadErr) ? (
        <p className="muted">Đang tải…</p>
      ) : (
        <RichEventEditor
          key={editId ?? "new"}
          canManageActivities={canManage}
          canLinkEvents={canLink}
          teams={teams}
          initial={initial}
          activityId={editId ?? undefined}
          onSubmit={submit}
        />
      )}
    </>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <CreateEventInner />
    </Suspense>
  );
}
