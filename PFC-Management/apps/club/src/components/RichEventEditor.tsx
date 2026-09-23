"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  isDirectVideo,
  renderMarkdown,
  videoEmbedSrc,
} from "@/lib/markdown";

export type RichEventDraft = {
  title: string;
  kind: "internal" | "linked";
  mode: "offline" | "online" | "hybrid";
  location: string;
  startsAt: string;
  endsAt: string;
  registerDeadline: string;
  capacity: string;
  hostTeamId: string;
  /** Single cover image (separate from gallery). */
  coverUrl: string;
  /** Gallery images only (excludes cover). */
  mediaUrls: string[];
  videoEmbeds: string[];
  bodyMd: string;
  externalEventId: string;
  ctaRegister: boolean;
  ctaBtc: boolean;
  ctaCheckin: boolean;
  publish: boolean;
};

const EMPTY: RichEventDraft = {
  title: "",
  kind: "internal",
  mode: "offline",
  location: "",
  startsAt: "",
  endsAt: "",
  registerDeadline: "",
  capacity: "",
  hostTeamId: "",
  coverUrl: "",
  mediaUrls: [],
  videoEmbeds: [""],
  bodyMd: "",
  externalEventId: "",
  ctaRegister: true,
  ctaBtc: false,
  ctaCheckin: false,
  publish: true,
};

const MAX_IMAGE_BYTES = 1_800_000;

type TeamOpt = { id: string; name: string };

type Props = {
  canManageActivities: boolean;
  canLinkEvents: boolean;
  teams?: TeamOpt[];
  initial?: Partial<RichEventDraft>;
  activityId?: string;
  onSubmit: (draft: RichEventDraft) => Promise<void>;
};

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

async function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không đọc được ảnh"));
    reader.readAsDataURL(file);
  });
}

/** Downscale large images via canvas before storing as data URL. */
async function compressImage(file: File): Promise<string> {
  const raw = await readImageAsDataUrl(file);
  if (file.size <= MAX_IMAGE_BYTES && file.size < 900_000) return raw;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(raw);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.82;
      let out = canvas.toDataURL("image/jpeg", quality);
      while (out.length > MAX_IMAGE_BYTES * 1.37 && quality > 0.45) {
        quality -= 0.1;
        out = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(out);
    };
    img.onerror = () => reject(new Error("Ảnh không hợp lệ"));
    img.src = raw;
  });
}

export function RichEventEditor({
  canManageActivities,
  canLinkEvents,
  teams = [],
  initial,
  activityId,
  onSubmit,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<RichEventDraft>(() => ({
    ...EMPTY,
    ...initial,
    coverUrl: initial?.coverUrl ?? EMPTY.coverUrl,
    mediaUrls: initial?.mediaUrls ?? EMPTY.mediaUrls,
    videoEmbeds:
      initial?.videoEmbeds?.length ? initial.videoEmbeds : EMPTY.videoEmbeds,
  }));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [coverErr, setCoverErr] = useState<string | null>(null);

  const canCreateInternal = canManageActivities;
  const canCreateLinked = canLinkEvents;

  const kindOptions = useMemo(() => {
    const opts: { value: "internal" | "linked"; label: string }[] = [];
    if (canCreateInternal) {
      opts.push({ value: "internal", label: "Hoạt động Nội bộ" });
    }
    if (canCreateLinked) {
      opts.push({ value: "linked", label: "Sự kiện Liên kết / Công khai" });
    }
    return opts;
  }, [canCreateInternal, canCreateLinked]);

  function set<K extends keyof RichEventDraft>(key: K, value: RichEventDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function onStartsAtChange(next: string) {
    setDraft((d) => {
      const syncDeadline =
        !d.registerDeadline || d.registerDeadline === d.startsAt;
      return {
        ...d,
        startsAt: next,
        registerDeadline: syncDeadline ? next : d.registerDeadline,
      };
    });
  }

  function onCapacityChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    set("capacity", digits);
  }

  function removeMedia(idx: number) {
    setDraft((d) => ({
      ...d,
      mediaUrls: d.mediaUrls.filter((_, i) => i !== idx),
    }));
  }

  function setVideoAt(idx: number, url: string) {
    setDraft((d) => {
      const next = [...d.videoEmbeds];
      next[idx] = url;
      return { ...d, videoEmbeds: next };
    });
  }

  function addVideo() {
    setDraft((d) => ({ ...d, videoEmbeds: [...d.videoEmbeds, ""] }));
  }

  function removeVideo(idx: number) {
    setDraft((d) => {
      const next = d.videoEmbeds.filter((_, i) => i !== idx);
      return { ...d, videoEmbeds: next.length ? next : [""] };
    });
  }

  async function processImageFiles(
    files: FileList | null,
    mode: "cover" | "gallery",
  ) {
    if (mode === "cover") setCoverErr(null);
    else setMediaErr(null);
    if (!files?.length) return;
    const added: string[] = [];
    const list =
      mode === "cover" ? [files[0]!] : Array.from(files);
    for (const file of list) {
      if (!file?.type.startsWith("image/")) {
        const msg = "Chỉ hỗ trợ file ảnh (JPG/PNG/WebP).";
        if (mode === "cover") setCoverErr(msg);
        else setMediaErr(msg);
        continue;
      }
      if (file.size > 8_000_000) {
        const msg = `「${file.name}」 quá lớn (>8MB). Nén hoặc chọn ảnh khác.`;
        if (mode === "cover") setCoverErr(msg);
        else setMediaErr(msg);
        continue;
      }
      try {
        const url = await compressImage(file);
        if (url.length > MAX_IMAGE_BYTES * 1.4) {
          const msg = `「${file.name}」 vẫn quá lớn sau khi nén — dùng URL ảnh thay thế.`;
          if (mode === "cover") setCoverErr(msg);
          else setMediaErr(msg);
          continue;
        }
        added.push(url);
      } catch {
        const msg = `Không xử lý được 「${file.name}」.`;
        if (mode === "cover") setCoverErr(msg);
        else setMediaErr(msg);
      }
    }
    if (!added.length) return;
    if (mode === "cover") {
      set("coverUrl", added[0]!);
      return;
    }
    setDraft((d) => ({
      ...d,
      mediaUrls: [...d.mediaUrls, ...added].slice(0, 24),
    }));
  }

  async function submit() {
    setErr(null);
    if (!draft.title.trim()) {
      setErr("Nhập tên sự kiện.");
      return;
    }
    if (draft.kind === "linked" && !draft.externalEventId.trim()) {
      setErr("Cần ID sự kiện trên Shared Event Hub.");
      return;
    }
    if (draft.kind === "internal" && !canCreateInternal) {
      setErr("Bạn không có quyền tạo hoạt động nội bộ.");
      return;
    }
    if (draft.kind === "linked" && !canCreateLinked) {
      setErr("Bạn không có quyền liên kết sự kiện Hub.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...draft,
        videoEmbeds: draft.videoEmbeds.map((v) => v.trim()).filter(Boolean),
      });
      setToast(activityId ? "Đã cập nhật bài đăng" : "Đã đăng sự kiện / hoạt động");
      setTimeout(() => router.push("/events"), 600);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Bạn không có quyền thực hiện thao tác này",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!kindOptions.length) {
    return (
      <p className="error-banner">
        Bạn không có quyền tạo sự kiện. Chỉ Chủ nhiệm / Ban điều hành / Trưởng
        ban mới được đăng.
      </p>
    );
  }

  const bodyPreview = draft.bodyMd;
  const videos = draft.videoEmbeds.filter((v) => v.trim());

  return (
    <div className="rich-event">
      <section className="card rich-block">
        <h3 className="rich-block-title">Thông tin cơ bản</h3>

        <label className="field-label">Tên sự kiện</label>
        <input
          className="field"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="VD: Workshop Quản lý ngân sách 2026"
        />

        <div className="rich-grid">
          <div className="rich-field">
            <label className="field-label">Loại sự kiện</label>
            <select
              className="field field-select"
              value={draft.kind}
              onChange={(e) =>
                set("kind", e.target.value as "internal" | "linked")
              }
            >
              {kindOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rich-field">
            <label className="field-label">Hình thức</label>
            <select
              className="field field-select"
              value={draft.mode}
              onChange={(e) =>
                set("mode", e.target.value as RichEventDraft["mode"])
              }
            >
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="rich-grid">
          <div className="rich-field">
            <label className="field-label">Bắt đầu</label>
            <input
              className="field field-datetime"
              type="datetime-local"
              value={draft.startsAt}
              onChange={(e) => onStartsAtChange(e.target.value)}
            />
          </div>
          <div className="rich-field">
            <label className="field-label">Kết thúc</label>
            <input
              className="field field-datetime"
              type="datetime-local"
              value={draft.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </div>
        </div>

        <div className="rich-grid">
          <div className="rich-field">
            <label className="field-label">Hạn chót đăng ký</label>
            <input
              className="field field-datetime"
              type="datetime-local"
              value={draft.registerDeadline}
              onChange={(e) => set("registerDeadline", e.target.value)}
            />
          </div>
          <div className="rich-field">
            <label className="field-label">Chỉ tiêu / SL tối đa</label>
            <input
              className="field"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="VD: 50"
              value={draft.capacity}
              onChange={(e) => onCapacityChange(e.target.value)}
            />
          </div>
        </div>

        <label className="field-label">Địa điểm</label>
        <input
          className="field"
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Hội trường A / Zoom / Hybrid"
        />

        <label className="field-label">Ban tổ chức</label>
        <select
          className="field field-select"
          value={draft.hostTeamId}
          onChange={(e) => set("hostTeamId", e.target.value)}
        >
          <option value="">— Chưa gán ban —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {draft.kind === "linked" && (
          <>
            <label className="field-label">External Event ID (Hub)</label>
            <input
              className="field"
              value={draft.externalEventId}
              onChange={(e) => set("externalEventId", e.target.value)}
              placeholder="evt_shared_demo_001"
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Club chỉ liên kết — vé/check-in trên Shared Event Hub (FR-CLB-010).
            </p>
          </>
        )}
      </section>

      <section className="card rich-block">
        <h3 className="rich-block-title">Ảnh & video</h3>

        <label className="field-label">Ảnh bìa (Cover)</label>
        {!draft.coverUrl ? (
          <div className="cover-drop">
            <label className="cover-drop-inner">
              <span>Chọn hoặc kéo ảnh bìa</span>
              <span className="muted" style={{ fontSize: 12 }}>
                JPG / PNG / WebP · tối đa ~1.8MB sau nén
              </span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void processImageFiles(e.target.files, "cover");
                  e.target.value = "";
                }}
              />
            </label>
            <input
              className="field media-url-input"
              style={{ marginTop: 8 }}
              placeholder="Hoặc dán URL ảnh bìa rồi Enter"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const el = e.currentTarget;
                const url = el.value.trim();
                if (!url) return;
                set("coverUrl", url);
                setCoverErr(null);
                el.value = "";
              }}
            />
          </div>
        ) : (
          <div className="cover-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.coverUrl} alt="Cover" />
            <div className="cover-preview-actions">
              <label className="btn-ghost">
                Đổi ảnh
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void processImageFiles(e.target.files, "cover");
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  set("coverUrl", "");
                  setCoverErr(null);
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        )}
        {coverErr && <p className="field-error">{coverErr}</p>}

        <label className="field-label" style={{ marginTop: 14 }}>
          Thư viện ảnh (Gallery)
        </label>
        <div className="media-actions">
          <label className="btn-ghost media-upload-btn">
            + Tải ảnh
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void processImageFiles(e.target.files, "gallery");
                e.target.value = "";
              }}
            />
          </label>
          <input
            className="field media-url-input"
            placeholder="Hoặc dán URL ảnh rồi Enter"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const el = e.currentTarget;
              const url = el.value.trim();
              if (!url) return;
              setDraft((d) => ({
                ...d,
                mediaUrls: [...d.mediaUrls, url].slice(0, 24),
              }));
              el.value = "";
              setMediaErr(null);
            }}
          />
        </div>
        {mediaErr && <p className="field-error">{mediaErr}</p>}

        {draft.mediaUrls.length > 0 && (
          <div className="media-grid">
            {draft.mediaUrls.map((url, idx) => (
              <div key={`${idx}-${url.slice(0, 24)}`} className="media-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button
                  type="button"
                  className="media-remove"
                  aria-label="Xóa ảnh"
                  onClick={() => removeMedia(idx)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="field-label" style={{ marginTop: 12 }}>
          Video (YouTube / Vimeo / TikTok / MP4)
        </label>
        {draft.videoEmbeds.map((url, idx) => (
          <div key={idx} className="video-row">
            <input
              className="field"
              value={url}
              onChange={(e) => setVideoAt(idx, e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <button
              type="button"
              className="btn-ghost video-remove"
              aria-label="Xóa video"
              onClick={() => removeVideo(idx)}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={addVideo}>
          + Thêm Video
        </button>
      </section>

      <section className="card rich-block">
        <h3 className="rich-block-title">Nội dung bài viết</h3>
        <RichTextEditor
          value={draft.bodyMd}
          onChange={(html) => set("bodyMd", html)}
        />

        {(bodyPreview.trim() || videos.length > 0) && (
          <div className="md-preview" style={{ marginTop: 12 }}>
            <p className="field-label">Xem trước</p>
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
                __html: looksLikeHtml(bodyPreview)
                  ? bodyPreview
                  : renderMarkdown(bodyPreview),
              }}
            />
          </div>
        )}

        <label className="field-label" style={{ marginTop: 12 }}>
          CTA
        </label>
        <div className="cta-row">
          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.ctaRegister}
              onChange={(e) => set("ctaRegister", e.target.checked)}
            />
            Đăng ký
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.ctaBtc}
              onChange={(e) => set("ctaBtc", e.target.checked)}
            />
            BTC
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.ctaCheckin}
              onChange={(e) => set("ctaCheckin", e.target.checked)}
            />
            Check-in QR
          </label>
        </div>

        {!activityId && (
          <label className="check-row" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={draft.publish}
              onChange={(e) => set("publish", e.target.checked)}
            />
            Xuất bản ngay
          </label>
        )}
      </section>

      {err && <div className="error-banner">{err}</div>}

      <div className="rich-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/events")}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="btn-primary solid"
          onClick={() => void submit()}
          disabled={busy}
        >
          {busy ? "Đang lưu…" : activityId ? "Lưu thay đổi" : "Đăng bài"}
        </button>
      </div>

      {toast && (
        <div className="toast-fixed" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
