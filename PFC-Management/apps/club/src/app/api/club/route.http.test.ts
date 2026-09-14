import { beforeEach, describe, expect, it, vi } from "vitest";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { db, sqlite } from "@/db";
import { migrateUp } from "@/db/migrate";
import { members, clubs, memberships, tasks } from "@/db/schema";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/session-token";

const { cookieJar } = vi.hoisted(() => ({
  cookieJar: { value: undefined as string | undefined },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.value && name === SESSION_COOKIE_NAME
        ? { name, value: cookieJar.value }
        : undefined,
    set: (name: string, value: string) => {
      if (name === SESSION_COOKIE_NAME) cookieJar.value = value;
    },
    delete: () => {
      cookieJar.value = undefined;
    },
  }),
}));

vi.mock("@/db/migrate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/migrate")>();
  return { ...actual, seedDemo: vi.fn(async () => {}) };
});

import { GET, POST } from "./route";

function wipe() {
  sqlite.exec("PRAGMA foreign_keys = OFF");
  for (const table of [
    "task_checklist_items",
    "tasks",
    "membership_history",
    "memberships",
    "activity_participants",
    "activities",
    "documents",
    "club_event_links",
    "audit_events",
    "idempotency_keys",
    "teams",
    "clubs",
    "members",
  ]) {
    sqlite.exec(`DELETE FROM ${table}`);
  }
  sqlite.exec("PRAGMA foreign_keys = ON");
}

function setSession(memberId: string | null, tokenOverride?: string) {
  if (memberId === null && !tokenOverride) {
    cookieJar.value = undefined;
    return;
  }
  cookieJar.value = tokenOverride ?? signSessionToken({ sub: memberId! });
}

async function getAction(action: string, clubId?: string) {
  const url = new URL("http://localhost/api/club");
  url.searchParams.set("action", action);
  if (clubId) url.searchParams.set("clubId", clubId);
  return GET(
    new Request(url, {
      headers: cookieJar.value
        ? { cookie: `${SESSION_COOKIE_NAME}=${cookieJar.value}` }
        : undefined,
    }),
  );
}

async function postAction(body: Record<string, unknown>) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookieJar.value) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${cookieJar.value}`;
  }
  return POST(
    new Request("http://localhost/api/club", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function seedHttpWorld() {
  const hash = bcrypt.hashSync("test-pass", 4);
  const aliceId = nanoid();
  const bobId = nanoid();
  const outsiderId = nanoid();
  const clubX = nanoid();
  const clubY = nanoid();
  const taskX = nanoid();
  const taskY = nanoid();

  db.insert(members)
    .values([
      {
        id: aliceId,
        email: "alice@test.pfc",
        fullName: "Alice",
        passwordHash: hash,
        isSuperAdmin: false,
      },
      {
        id: bobId,
        email: "bob@test.pfc",
        fullName: "Bob",
        passwordHash: hash,
        isSuperAdmin: false,
      },
      {
        id: outsiderId,
        email: "out@test.pfc",
        fullName: "Outsider",
        passwordHash: hash,
        isSuperAdmin: false,
      },
    ])
    .run();

  db.insert(clubs)
    .values([
      {
        id: clubX,
        name: "Club X",
        slug: `club-x-${clubX.slice(0, 6)}`,
        visibility: "private",
        status: "active",
        ownerId: aliceId,
      },
      {
        id: clubY,
        name: "Club Y",
        slug: `club-y-${clubY.slice(0, 6)}`,
        visibility: "private",
        status: "active",
        ownerId: bobId,
      },
    ])
    .run();

  db.insert(memberships)
    .values([
      {
        id: nanoid(),
        clubId: clubX,
        memberId: aliceId,
        position: "member",
        status: "active",
      },
      {
        id: nanoid(),
        clubId: clubY,
        memberId: bobId,
        position: "owner",
        status: "active",
      },
    ])
    .run();

  db.insert(tasks)
    .values([
      {
        id: taskX,
        clubId: clubX,
        title: "X task",
        assignerId: aliceId,
        status: "todo",
      },
      {
        id: taskY,
        clubId: clubY,
        title: "Y task",
        assignerId: bobId,
        assigneeId: bobId,
        status: "todo",
      },
    ])
    .run();

  return { aliceId, bobId, outsiderId, clubX, clubY, taskX, taskY };
}

describe("CM-104 / CM-216 HTTP route + HMAC cookie", () => {
  beforeEach(() => {
    migrateUp();
    wipe();
    cookieJar.value = undefined;
  });

  it("POST task_transition on another club's taskId returns HTTP 403", async () => {
    const w = seedHttpWorld();
    setSession(w.aliceId);
    const res = await postAction({
      action: "task_transition",
      taskId: w.taskY,
      to: "in_progress",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBeDefined();
  });

  it("GET private club as non-member returns HTTP 403 (ADR-003)", async () => {
    const w = seedHttpWorld();
    setSession(w.outsiderId);
    const res = await getAction("club", w.clubX);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("missing cookie on authenticated action returns HTTP 401", async () => {
    seedHttpWorld();
    setSession(null);
    const res = await getAction("me");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("tampered HMAC cookie returns HTTP 401", async () => {
    const w = seedHttpWorld();
    const token = signSessionToken({ sub: w.aliceId });
    const [payload, sig] = token.split(".");
    setSession(null, `${payload}.${sig.slice(0, -2)}aa`);
    const res = await getAction("me");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("GET tasks as club member returns HTTP 200 with that club's tasks only", async () => {
    const w = seedHttpWorld();
    setSession(w.aliceId);
    const res = await getAction("tasks", w.clubX);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: w.taskX, title: "X task", clubId: w.clubX }),
      ]),
    );
    expect(body.tasks.some((t: { id: string }) => t.id === w.taskY)).toBe(
      false,
    );
  });

  it("POST create_task as owner of the club returns HTTP 200", async () => {
    const w = seedHttpWorld();
    setSession(w.bobId);
    const res = await postAction({
      action: "create_task",
      clubId: w.clubY,
      title: "Owner created",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.taskId).toBe("string");
    expect(body.taskId.length).toBeGreaterThan(0);
  });
});
