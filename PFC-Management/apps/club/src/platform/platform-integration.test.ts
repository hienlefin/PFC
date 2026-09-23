import { describe, expect, it } from "vitest";
import {
  buildSsoStartUrl,
  isSsoEnabled,
  parseSsoClaimsFromIdToken,
  ssoConfig,
} from "@/platform/sso";
import { eventDeepLinks, resolveExternalEvents } from "@/platform/event-engine";
import { sendEmail } from "@/platform/channels/email";
import { sendPush } from "@/platform/channels/push";

describe("ADR-008 platform contracts", () => {
  it("SSO disabled by default", () => {
    const prev = process.env.PLATFORM_SSO_MODE;
    process.env.PLATFORM_SSO_MODE = "off";
    expect(ssoConfig().enabled).toBe(false);
    process.env.PLATFORM_SSO_MODE = prev;
  });

  it("SSO dev mode mints and verifies id_token", () => {
    process.env.PLATFORM_SSO_MODE = "dev";
    process.env.PLATFORM_SSO_SHARED_SECRET = "test-secret-sso";
    process.env.CLUB_FLAG_SSO = "1";
    expect(isSsoEnabled()).toBe(true);
    const started = buildSsoStartUrl({
      email: "leader@pfc.vn",
      name: "Leader",
    });
    const u = new URL(started.url);
    const token = u.searchParams.get("id_token")!;
    const claims = parseSsoClaimsFromIdToken(token);
    expect(claims.email).toBe("leader@pfc.vn");
    expect(claims.sub).toBeTruthy();
  });

  it("Event deep-links never point into Club payment routes", async () => {
    process.env.EVENT_HUB_PUBLIC_URL = "https://events.pfc.vn";
    process.env.CLUB_FLAG_EVENT_ENGINE = "0";
    const links = eventDeepLinks("evt_summit_2026");
    expect(links.ticketUrl).toContain("events.pfc.vn");
    expect(links.ticketUrl).toContain("/tickets");
    expect(links.registerUrl).toContain("/register");
    const map = await resolveExternalEvents(["evt_summit_2026"], {
      evt_summit_2026: "PFC Young Leaders Summit 2026",
    });
    const card = map.get("evt_summit_2026")!;
    expect(card.degraded).toBe(true);
    expect(card.title).toContain("Summit");
    expect(card.ticketUrl).toBe(links.ticketUrl);
  });

  it("email/push stub when credentials absent", async () => {
    delete process.env.NOTIFY_EMAIL_API_KEY;
    delete process.env.NOTIFY_PUSH_WEBHOOK_URL;
    await expect(
      sendEmail({ to: "a@pfc.vn", subject: "Hi", text: "body" }),
    ).resolves.toBe("stub");
    await expect(
      sendPush({ recipientId: "m1", title: "Hi", body: "b" }),
    ).resolves.toBe("stub");
  });
});
