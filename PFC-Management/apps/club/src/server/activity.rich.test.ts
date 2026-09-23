import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { members } from "@/db/schema";
import { migrateUp } from "@/db/migrate";
import { migrateDown } from "@/db/migrate-meta";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import * as clubs from "@/server/clubs";
import * as ops from "@/server/ops";
import { renderMarkdown, videoEmbedSrc } from "@/lib/markdown";

function asUser(row: {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
}): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    isSuperAdmin: row.isSuperAdmin,
  };
}

function insertUser(email: string) {
  const id = nanoid();
  db.insert(members)
    .values({
      id,
      email,
      fullName: email,
      passwordHash: bcrypt.hashSync("PFC123!", 4),
      isSuperAdmin: false,
    })
    .run();
  return asUser({
    id,
    email,
    fullName: email,
    isSuperAdmin: false,
  });
}

describe("Rich activity post + RBAC", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("owner can create rich internal post; member cannot", () => {
    const owner = insertUser("rich-owner@pfc.vn");
    const memberUser = insertUser("rich-member@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Rich Post Club",
      visibility: "open",
    });
    clubs.requestJoin(memberUser, club.id);

    const id = ops.createActivity(owner, club.id, {
      title: "Workshop Ngân sách",
      kind: "internal",
      mode: "offline",
      location: "Hội trường A",
      bodyMd: "## Hello\n\n**Bold** tip",
      coverUrl: "https://example.com/cover.jpg",
      videoUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
      cta: { register: true, btc: true, checkin: false },
      mediaUrls: ["https://placehold.co/600x400"],
      videoEmbeds: ["https://www.youtube.com/watch?v=abc123XYZ01"],
      capacity: 40,
      registerDeadline: new Date("2026-09-30T23:59:00Z"),
      status: "active",
      startsAt: new Date("2026-10-01T08:00:00Z"),
      endsAt: new Date("2026-10-01T11:00:00Z"),
    });

    const detail = ops.getActivity(owner, id);
    expect(detail.kind).toBe("internal");
    expect(detail.bodyMd).toContain("**Bold**");
    expect(detail.cta.btc).toBe(true);
    expect(detail.mode).toBe("offline");
    expect(detail.mediaUrls.length).toBeGreaterThan(0);
    expect(detail.capacity).toBe(40);

    expect(() =>
      ops.createActivity(memberUser, club.id, {
        title: "Hack",
        kind: "internal",
      }),
    ).toThrow(AppError);
    try {
      ops.createActivity(memberUser, club.id, {
        title: "Hack",
        kind: "internal",
      });
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
  });

  it("linked post requires link_events + externalEventId; creates club_event_links", () => {
    const owner = insertUser("link-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Link Club",
      visibility: "open",
    });

    expect(() =>
      ops.createActivity(owner, club.id, {
        title: "Summit",
        kind: "linked",
      }),
    ).toThrow(/externalEventId/);

    const id = ops.createActivity(owner, club.id, {
      title: "Young Leaders Summit",
      kind: "linked",
      externalEventId: "evt_rich_001",
      bodyMd: "Đăng ký trên Hub",
      status: "active",
      cta: { register: true, checkin: true },
    });

    const links = ops.listLinkedEvents(owner, club.id);
    expect(links.some((l) => l.externalEventId === "evt_rich_001")).toBe(true);
    expect(ops.getActivity(owner, id).externalEventId).toBe("evt_rich_001");
  });

  it("member can join active internal activity", () => {
    const owner = insertUser("join-owner@pfc.vn");
    const memberUser = insertUser("join-member@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Join Club",
      visibility: "open",
    });
    clubs.requestJoin(memberUser, club.id);
    const id = ops.createActivity(owner, club.id, {
      title: "Meetup",
      kind: "internal",
      status: "active",
    });
    ops.joinActivity(memberUser, id);
    const detail = ops.getActivity(memberUser, id);
    expect(detail.joined).toBe(true);
    expect(detail.participantCount).toBe(1);
  });
});

describe("markdown helpers", () => {
  it("renders bold/heading and embeds YouTube", () => {
    const html = renderMarkdown("## Hi\n\n**x**");
    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>x</strong>");
    expect(videoEmbedSrc("https://youtu.be/dQw4w9WgXcQ")).toContain(
      "youtube.com/embed/",
    );
  });
});
