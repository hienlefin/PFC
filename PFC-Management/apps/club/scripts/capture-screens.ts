/**
 * Capture all Club + Event Hub display screens for QA / DATA evidence.
 * Usage: npm run screenshots
 * Optional: BASE_URL, HUB_URL, OUT_DIR
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const HUB = process.env.HUB_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(process.env.OUT_DIR ?? "docs/qa/screenshots");

const CLUB_PAGES: { name: string; path: string }[] = [
  { name: "01-login", path: "/login" },
  { name: "02-home", path: "/" },
  { name: "03-members", path: "/members" },
  { name: "04-join", path: "/join" },
  { name: "05-tasks", path: "/tasks" },
  { name: "06-events", path: "/events" },
  { name: "07-manage", path: "/manage" },
  { name: "08-manage-queue", path: "/manage/queue" },
];

async function shot(
  page: import("@playwright/test").Page,
  name: string,
  url: string,
) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("OK", name, "→", file);
}

async function shotCurrent(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.waitForTimeout(600);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("OK", name, "→", file);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // --- Club: login (logged out) ---
  await context.clearCookies();
  await shot(page, "01-login", `${BASE}/login`);

  // Login as leader
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="leader@pfc.vn"]', "leader@pfc.vn");
  await page.locator('input[type="password"]').fill("PFC123!");
  await page.getByRole("button", { name: /Đăng nhập/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), {
    timeout: 15000,
  });
  await page.waitForTimeout(1000);

  for (const p of CLUB_PAGES.filter((x) => x.name !== "01-login")) {
    await shot(page, p.name, `${BASE}${p.path}`);
  }

  // Member profile — prefer another member
  const home = await page.request.get(`${BASE}/api/club?action=home`);
  const json = await home.json();
  const me = json.user?.id as string | undefined;
  const other =
    (json.members as { id: string; memberId: string }[] | undefined)?.find(
      (m) => m.memberId !== me,
    ) ?? json.members?.[0];
  if (other?.id) {
    await shot(page, "09-member-profile", `${BASE}/members/${other.id}`);
  } else {
    console.warn("SKIP 09-member-profile — no members");
  }

  // Invite panel
  await page.goto(`${BASE}/members`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const inviteBtn = page.getByRole("button", {
    name: /Mời thành viên|Mời \/ Thêm/i,
  });
  if (await inviteBtn.count()) {
    await inviteBtn.click();
    await shotCurrent(page, "10-members-invite");
  } else {
    console.warn("SKIP 10-members-invite — invite button not found");
  }

  // Members view variants
  const tableBtn = page.getByRole("button", { name: /^Bảng$/i });
  if (await tableBtn.count()) {
    await tableBtn.click();
    await shotCurrent(page, "11-members-table");
  }
  const orgBtn = page.getByRole("button", { name: /^Cây$/i });
  if (await orgBtn.count()) {
    await orgBtn.click();
    await shotCurrent(page, "12-members-org");
  }

  // Tasks — open first card modal
  await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const taskCard = page.locator("button.task-card").first();
  if (await taskCard.count()) {
    await taskCard.click();
    await page.waitForSelector(".task-modal, [role='dialog']", {
      timeout: 5000,
    });
    await shotCurrent(page, "13-task-modal");
    await page.keyboard.press("Escape").catch(() => undefined);
  } else {
    console.warn("SKIP 13-task-modal — no task card");
  }

  // Events — Vé của tôi chip
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const mineChip = page.getByRole("button", { name: /Vé của tôi/i }).first();
  if (await mineChip.count()) {
    await mineChip.click();
    await shotCurrent(page, "14-events-tickets");
  }

  // Events — Hub degrade modal (force /health fail so dialog shows)
  await page.getByRole("button", { name: /Sắp tới/i }).first().click().catch(() => undefined);
  await page.waitForTimeout(400);
  await page.route("**/health", (route) => route.abort());
  const registerBtn = page.getByRole("button", { name: /Đăng ký tham gia/i }).first();
  if (await registerBtn.count()) {
    await registerBtn.click();
    await page.waitForSelector("[role='dialog']", { timeout: 5000 });
    await shotCurrent(page, "15-events-hub-modal");
    await page.keyboard.press("Escape").catch(() => undefined);
  } else {
    console.warn("SKIP 15-events-hub-modal — register button not found");
  }
  await page.unroute("**/health");

  // --- Event Hub stub HTML surfaces ---
  await shot(page, "20-hub-events", `${HUB}/events`);
  await page.goto(`${HUB}/events/evt_shared_demo_001/register`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("hub.ticket.evt_shared_demo_001");
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shotCurrent(page, "21-hub-register");
  await page.locator('input[name="email"]').fill("leader@pfc.vn");
  await page.locator('input[name="studentId"]').fill("21520001");
  await page.locator("#btn-free").click();
  await page.waitForSelector("#ticket-card:not(.hidden)", { timeout: 5000 });
  await shotCurrent(page, "22-hub-ticket");
  await shot(
    page,
    "23-hub-checkin",
    `${HUB}/events/evt_shared_demo_001/check-in`,
  );

  await browser.close();
  console.log("\nDone →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
