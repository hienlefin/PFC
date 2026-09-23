/**
 * Probe Shared Event Hub before navigating (avoids ERR_CONNECTION_REFUSED blank tab).
 * Demo tickets stay localStorage-only — Club does not own real ticketing (ADR-004/008).
 */

const TICKETS_KEY = "club.demo.localTickets";

export type LocalDemoTicket = {
  eventId: string;
  title: string;
  code: string;
  issuedAt: string;
  hubUrl: string;
  fullName?: string;
  studentId?: string;
  status?: string;
  source?: "hub" | "local";
};

export function hubOriginFromUrl(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export async function probeEventHub(
  hubUrlOrOrigin: string,
  timeoutMs = 1500,
): Promise<boolean> {
  const origin = hubOriginFromUrl(hubUrlOrOrigin) ?? hubUrlOrOrigin;
  try {
    const res = await fetch(`${origin}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function readTickets(): LocalDemoTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalDemoTicket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTickets(rows: LocalDemoTicket[]) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(rows));
}

export function listLocalDemoTickets(): LocalDemoTicket[] {
  return readTickets();
}

export function getLocalDemoTicket(eventId: string): LocalDemoTicket | null {
  return readTickets().find((t) => t.eventId === eventId) ?? null;
}

export function issueLocalDemoTicket(input: {
  eventId: string;
  title: string;
  hubUrl: string;
  code?: string;
  fullName?: string;
  studentId?: string;
  status?: string;
  source?: "hub" | "local";
}): LocalDemoTicket {
  const code =
    input.code ||
    `PFC-DEMO-${input.eventId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6)
      .toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const ticket: LocalDemoTicket = {
    eventId: input.eventId,
    title: input.title,
    code,
    issuedAt: new Date().toISOString(),
    hubUrl: input.hubUrl,
    fullName: input.fullName,
    studentId: input.studentId,
    status: input.status || "Đã xác nhận",
    source: input.source || "local",
  };
  const next = readTickets().filter((t) => t.eventId !== input.eventId);
  next.unshift(ticket);
  writeTickets(next);
  return ticket;
}

/** Import ticket payload from Event Hub back-link (?hubTicket=base64json). */
export function importHubTicketFromQuery(
  hubTicketParam: string | null,
): LocalDemoTicket | null {
  if (!hubTicketParam || typeof window === "undefined") return null;
  try {
    const binary = atob(decodeURIComponent(hubTicketParam));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const raw = JSON.parse(json) as {
      eventId?: string;
      title?: string;
      code?: string;
      fullName?: string;
      studentId?: string;
      status?: string;
      issuedAt?: string;
    };
    if (!raw.eventId || !raw.code) return null;
    return issueLocalDemoTicket({
      eventId: raw.eventId,
      title: raw.title || "Sự kiện PFC",
      hubUrl: `http://127.0.0.1:3100/events/${encodeURIComponent(raw.eventId)}/tickets/mine`,
      code: raw.code,
      fullName: raw.fullName,
      studentId: raw.studentId,
      status: raw.status || "Đã xác nhận",
      source: "hub",
    });
  } catch {
    return null;
  }
}

/** Pretty title for smoke / degraded event ids in Club UI. */
export function displayEventTitle(
  eventId: string,
  title?: string | null,
  label?: string | null,
): string {
  if (eventId.startsWith("smoke-evt-") || title?.startsWith("smoke-evt-")) {
    return "PFC Young Leaders Summit 2026";
  }
  return title || label || `Sự kiện ${eventId}`;
}
