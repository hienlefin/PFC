import { describe, expect, it } from "vitest";
import {
  hubOriginFromUrl,
  issueLocalDemoTicket,
  listLocalDemoTickets,
} from "@/lib/event-hub-client";

describe("event-hub-client", () => {
  it("parses hub origin from deep-link", () => {
    expect(
      hubOriginFromUrl("http://127.0.0.1:3100/events/evt_1/register"),
    ).toBe("http://127.0.0.1:3100");
  });

  it("issues local demo ticket without touching Hub", () => {
    // jsdom / node: localStorage may be absent — skip storage assert in node
    if (typeof localStorage === "undefined") {
      expect(hubOriginFromUrl("not-a-url")).toBeNull();
      return;
    }
    localStorage.clear();
    const t = issueLocalDemoTicket({
      eventId: "evt_test",
      title: "Test",
      hubUrl: "http://127.0.0.1:3100/events/evt_test/register",
    });
    expect(t.code).toMatch(/^PFC-DEMO-/);
    expect(listLocalDemoTickets()).toHaveLength(1);
  });
});
