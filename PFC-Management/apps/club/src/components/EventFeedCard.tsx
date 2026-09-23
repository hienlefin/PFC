"use client";

import Link from "next/link";
import { useId, useState } from "react";

export type FeedCardModel = {
  id: string;
  title: string;
  summary?: string | null;
  coverUrl?: string | null;
  mode?: string | null;
  location?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  capacity?: number | null;
  registeredCount?: number | null;
  hasTicket?: boolean;
  kindLabel?: string;
  href?: string;
  primaryAction: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: "primary" | "secondary";
  };
};

function fmtRange(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
): string | null {
  if (!startsAt) return null;
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  if (Number.isNaN(start.getTime())) return null;
  const time = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const date = start.toLocaleDateString("vi-VN");
  if (endsAt) {
    const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
    if (!Number.isNaN(end.getTime())) {
      return `${time(start)} - ${time(end)} | ${date}`;
    }
  }
  return `${time(start)} | ${date}`;
}

function modeBadge(mode?: string | null) {
  if (mode === "online") return { text: "🟢 Online", cls: "online" };
  if (mode === "hybrid") return { text: "🔀 Hybrid", cls: "hybrid" };
  if (mode === "offline") return { text: "🏢 Offline", cls: "offline" };
  return null;
}

function CoverFallback({ uid }: { uid: string }) {
  const g = `evtGrad-${uid}`;
  return (
    <div className="evt-cover-fallback" aria-hidden>
      <svg
        viewBox="0 0 320 168"
        className="evt-cover-svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="320" height="168" fill={`url(#${g})`} />
        {/* floating doodles */}
        <g className="evt-float evt-float-a">
          <text x="36" y="42" fontSize="18">
            ✨
          </text>
        </g>
        <g className="evt-float evt-float-b">
          <text x="250" y="48" fontSize="16">
            🫧
          </text>
        </g>
        <g className="evt-float evt-float-c">
          <text x="48" y="130" fontSize="18">
            🎉
          </text>
        </g>
        <circle cx="70" cy="100" r="18" fill="rgba(255,255,255,0.22)" />
        <circle cx="280" cy="120" r="28" fill="rgba(255,255,255,0.16)" />
        <circle cx="160" cy="84" r="36" fill="rgba(255,255,255,0.2)" />
        <text x="148" y="92" fontSize="28">
          🎟️
        </text>
        <text x="210" y="140" fontSize="14" opacity="0.9">
          ⭐
        </text>
        <text x="90" y="55" fontSize="12" opacity="0.85">
          💫
        </text>
      </svg>
    </div>
  );
}

function SeatsBar({
  capacity,
  registered,
}: {
  capacity: number;
  registered: number;
}) {
  const filled = Math.min(100, Math.round((registered / capacity) * 100));
  const left = Math.max(0, capacity - registered);
  const hot = filled >= 70;
  return (
    <div className="evt-seats">
      <div className="evt-seats-row">
        <span className="evt-seats-label">
          {hot ? "🔥 " : "🎟️ "}
          {left > 0 ? `Còn lại ${left} chỗ` : "Hết chỗ rồi!"}
        </span>
        <span className="evt-seats-pct">{filled}%</span>
      </div>
      <div className="evt-seats-track" role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`evt-seats-fill${hot ? " hot" : ""}`}
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  );
}

export function EventFeedCard({ card }: { card: FeedCardModel }) {
  const uid = useId().replace(/:/g, "");
  const [imgReady, setImgReady] = useState(false);
  const when = fmtRange(card.startsAt, card.endsAt);
  const mode = modeBadge(card.mode);
  const upcoming =
    !!card.startsAt &&
    new Date(
      typeof card.startsAt === "string" ? card.startsAt : card.startsAt,
    ).getTime() > Date.now();

  const registered = card.registeredCount ?? 0;
  const showSeats = card.capacity != null && card.capacity > 0;
  const isHot = showSeats && registered / (card.capacity as number) >= 0.7;

  const ctaClass =
    card.primaryAction.variant === "secondary"
      ? "evt-cta is-secondary"
      : "evt-cta";

  const cta = (
    <>
      <span className="evt-cta-shimmer" aria-hidden />
      <span className="evt-cta-label">{card.primaryAction.label}</span>
    </>
  );

  const body = (
    <>
      <div className="evt-cover">
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverUrl}
            alt=""
            className={`evt-cover-img${imgReady ? " is-ready" : ""}`}
            onLoad={() => setImgReady(true)}
          />
        ) : (
          <CoverFallback uid={uid} />
        )}
        <div className="evt-badges">
          {upcoming ? (
            <span className="evt-badge live">
              <span className="evt-pulse-wrap" aria-hidden>
                <span className="evt-pulse-dot" />
                <span className="evt-pulse-ring" />
              </span>
              Sắp diễn ra
            </span>
          ) : null}
          {isHot ? (
            <span className="evt-badge hot">
              <span className="evt-pulse-wrap" aria-hidden>
                <span className="evt-pulse-dot hot" />
                <span className="evt-pulse-ring hot" />
              </span>
              Hot
            </span>
          ) : null}
          {mode ? (
            <span className={`evt-badge ${mode.cls}`}>{mode.text}</span>
          ) : null}
          {card.hasTicket ? (
            <span className="evt-badge ticket">🎟️ Đã có vé</span>
          ) : null}
          {card.kindLabel ? (
            <span className="evt-badge kind">{card.kindLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="evt-body">
        <h3 className="evt-title">{card.title}</h3>
        {card.summary ? (
          <p className="evt-summary">{card.summary}</p>
        ) : null}

        <ul className="evt-meta">
          {when ? (
            <li>
              <span className="evt-ico time" aria-hidden>
                🗓️
              </span>
              <span>{when}</span>
            </li>
          ) : null}
          {card.location ? (
            <li>
              <span className="evt-ico place" aria-hidden>
                📍
              </span>
              <span>{card.location}</span>
            </li>
          ) : null}
          {showSeats ? (
            <li>
              <span className="evt-ico seats" aria-hidden>
                👥
              </span>
              <span>
                {registered}/{card.capacity} chỗ
              </span>
            </li>
          ) : null}
        </ul>

        {showSeats ? (
          <SeatsBar capacity={card.capacity!} registered={registered} />
        ) : null}

        {card.primaryAction.href ? (
          <Link
            href={card.primaryAction.href}
            className={ctaClass}
            onClick={(e) => e.stopPropagation()}
          >
            {cta}
          </Link>
        ) : (
          <button
            type="button"
            className={ctaClass}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              card.primaryAction.onClick?.();
            }}
          >
            {cta}
          </button>
        )}
      </div>
    </>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="evt-card">
        {body}
      </Link>
    );
  }

  return <article className="evt-card">{body}</article>;
}
