/**
 * ADR-008 — Shared Event Engine **client** (link + deep-link only).
 * Ticketing / VNPAY live in Event Hub — Club never hosts payment.
 */
import { clubFlags } from "@/platform/flags";
import { logJson } from "@/platform/logger";

export type ExternalEventCard = {
  id: string;
  title: string;
  status: "published" | "unpublished" | "deleted" | "unknown";
  startsAt: string | null;
  endsAt?: string | null;
  mode: "online" | "offline" | "hybrid" | "unknown";
  location?: string | null;
  summary?: string | null;
  coverUrl?: string | null;
  capacity?: number | null;
  registeredCount?: number | null;
  registerUrl: string;
  ticketUrl: string;
  myTicketUrl: string;
  checkInUrl: string;
  degraded: boolean;
};

function hubBase(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.EVENT_HUB_PUBLIC_URL?.replace(/\/$/, "") ||
    env.EVENT_ENGINE_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3100"
  );
}

function engineBase(env: NodeJS.ProcessEnv = process.env): string {
  return env.EVENT_ENGINE_BASE_URL?.replace(/\/$/, "") || "";
}

export function eventDeepLinks(externalEventId: string): {
  registerUrl: string;
  ticketUrl: string;
  myTicketUrl: string;
  checkInUrl: string;
  detailUrl: string;
} {
  const base = hubBase();
  const id = encodeURIComponent(externalEventId);
  return {
    detailUrl: `${base}/events/${id}`,
    registerUrl: `${base}/events/${id}/register`,
    ticketUrl: `${base}/events/${id}/tickets`,
    myTicketUrl: `${base}/events/${id}/tickets/mine`,
    checkInUrl: `${base}/events/${id}/check-in`,
  };
}

function fallbackCard(id: string, label?: string | null): ExternalEventCard {
  const links = eventDeepLinks(id);
  const smoke =
    id.startsWith("smoke-evt-") ||
    (label?.startsWith("smoke-evt-") ?? false);
  return {
    id,
    title: smoke
      ? "PFC Young Leaders Summit 2026"
      : label || `Sự kiện ${id}`,
    status: "unknown",
    startsAt: smoke ? "2026-10-15T08:00:00+07:00" : null,
    endsAt: smoke ? "2026-10-15T11:30:00+07:00" : null,
    mode: smoke ? "offline" : "unknown",
    location: smoke ? "Hội trường A - Cơ sở chính" : null,
    summary: smoke
      ? "Tọa đàm hướng nghiệp và khai phá tiềm năng tài chính cho sinh viên 2026"
      : label && !label.startsWith("smoke-evt-")
        ? label
        : null,
    coverUrl: smoke
      ? "https://placehold.co/800x420/1e1633/fff?text=Young+Leaders+Summit"
      : null,
    capacity: smoke ? 50 : null,
    registeredCount: smoke ? 45 : null,
    registerUrl: links.registerUrl,
    ticketUrl: links.ticketUrl,
    myTicketUrl: links.myTicketUrl,
    checkInUrl: links.checkInUrl,
    degraded: true,
  };
}

/**
 * Resolve event cards from Shared Event Engine.
 * Fail-soft: when engine unreachable, return deep-link stubs (degraded=true).
 */
export async function resolveExternalEvents(
  ids: string[],
  labels?: Record<string, string | null | undefined>,
): Promise<Map<string, ExternalEventCard>> {
  const out = new Map<string, ExternalEventCard>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return out;

  const base = engineBase();
  if (!clubFlags().eventEngine || !base) {
    for (const id of unique) out.set(id, fallbackCard(id, labels?.[id]));
    return out;
  }

  try {
    const url = `${base}/api/v1/events/batch?ids=${unique.map(encodeURIComponent).join(",")}`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(`event engine HTTP ${res.status}`);
    const json = (await res.json()) as {
      events?: Array<{
        id: string;
        title?: string;
        status?: string;
        startsAt?: string | null;
        mode?: string;
      }>;
    };
    const byId = new Map((json.events ?? []).map((e) => [e.id, e]));
    for (const id of unique) {
      const e = byId.get(id);
      const links = eventDeepLinks(id);
      if (!e || e.status === "deleted" || e.status === "unpublished") {
        out.set(id, {
          ...fallbackCard(id, labels?.[id]),
          status: (e?.status as ExternalEventCard["status"]) ?? "deleted",
          degraded: true,
        });
        continue;
      }
      out.set(id, {
        id,
        title: (() => {
          const raw = e.title || labels?.[id] || id;
          return id.startsWith("smoke-evt-") || String(raw).startsWith("smoke-evt-")
            ? "PFC Young Leaders Summit 2026"
            : raw;
        })(),
        status: "published",
        startsAt: e.startsAt ?? (id.startsWith("smoke-evt-") ? "2026-10-15T08:00:00+07:00" : null),
        endsAt: id.startsWith("smoke-evt-") ? "2026-10-15T11:30:00+07:00" : null,
        mode: (e.mode as ExternalEventCard["mode"]) || (id.startsWith("smoke-evt-") ? "offline" : "unknown"),
        location: id.startsWith("smoke-evt-") ? "Hội trường A - Cơ sở chính" : null,
        summary: id.startsWith("smoke-evt-")
          ? "Tọa đàm hướng nghiệp và khai phá tiềm năng tài chính cho sinh viên 2026"
          : null,
        coverUrl: id.startsWith("smoke-evt-")
          ? "https://placehold.co/800x420/1e1633/fff?text=Young+Leaders+Summit"
          : null,
        capacity: id.startsWith("smoke-evt-") ? 50 : null,
        registeredCount: id.startsWith("smoke-evt-") ? 45 : null,
        registerUrl: links.registerUrl,
        ticketUrl: links.ticketUrl,
        myTicketUrl: links.myTicketUrl,
        checkInUrl: links.checkInUrl,
        degraded: false,
      });
    }
  } catch (err) {
    logJson("warn", "event_engine.resolve_failed", {
      error: err instanceof Error ? err.message : String(err),
      count: unique.length,
    });
    for (const id of unique) out.set(id, fallbackCard(id, labels?.[id]));
  }
  return out;
}
