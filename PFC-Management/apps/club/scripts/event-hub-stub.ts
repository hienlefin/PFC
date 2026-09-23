/**
 * Local Shared Event Hub stub (ADR-008) — port 3100.
 * Client-side isRegistered flow + QR + sync ticket back to Club App.
 */
import http from "node:http";
import { URL } from "node:url";
import QRCode from "qrcode";

const PORT = Number(process.env.EVENT_HUB_PORT || 3100);
const HOST = process.env.EVENT_HUB_HOST || "127.0.0.1";
const CLUB_APP_URL =
  process.env.CLUB_APP_PUBLIC_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:3000";

const SUMMIT_TITLE = "PFC Young Leaders Summit 2026";
const FALLBACK_TIME_LABEL = "08:00 - 11:30, Ngày 15/10/2026";
const FALLBACK_VENUE = "Hội trường A - Cơ sở chính";
const DEMO_HOLDER = "Nguyễn Đức Tuấn";

type EventMeta = {
  title: string;
  status: string;
  mode: "online" | "offline" | "hybrid" | "unknown";
  startsAt: string | null;
  endsAt: string | null;
  venue: string;
  timeLabel: string;
  description: string;
  bannerGradient: string;
};

const DEMO: Record<string, EventMeta> = {
  evt_shared_demo_001: {
    title: SUMMIT_TITLE,
    status: "published",
    mode: "hybrid",
    startsAt: "2026-10-15T08:00:00+07:00",
    endsAt: "2026-10-15T11:30:00+07:00",
    venue: FALLBACK_VENUE,
    timeLabel: FALLBACK_TIME_LABEL,
    description:
      "Hội nghị thường niên Personal Finance Club: leadership, đầu tư cá nhân, workshop Ban chuyên môn & networking với alumni PFC.",
    bannerGradient:
      "linear-gradient(135deg, #3d2e6b 0%, #6b5a9e 45%, #c4b5fd 100%)",
  },
};

function isSmokeId(id: string): boolean {
  return id.startsWith("smoke-evt-");
}

function resolveEvent(id: string): EventMeta & { id: string } {
  if (DEMO[id]) return { id, ...DEMO[id] };
  if (isSmokeId(id) || id.startsWith("smoke")) {
    return {
      id,
      title: SUMMIT_TITLE,
      status: "published",
      mode: "offline",
      startsAt: "2026-10-15T08:00:00+07:00",
      endsAt: "2026-10-15T11:30:00+07:00",
      venue: FALLBACK_VENUE,
      timeLabel: FALLBACK_TIME_LABEL,
      description:
        "Sự kiện PFC Young Leaders Summit 2026 (mock fallback khi ID dạng smoke-evt-*).",
      bannerGradient:
        "linear-gradient(135deg, #3d2e6b 0%, #6b5a9e 45%, #c4b5fd 100%)",
    };
  }
  return {
    id,
    title: `Sự kiện ${id}`,
    status: "published",
    mode: "unknown",
    startsAt: null,
    endsAt: null,
    venue: FALLBACK_VENUE,
    timeLabel: FALLBACK_TIME_LABEL,
    description: "Sự kiện liên kết từ PFC Club (deep-link demo).",
    bannerGradient: "linear-gradient(135deg, #3d2e6b 0%, #6b5a9e 100%)",
  };
}

function ticketCodeFor(eventId: string, studentId: string): string {
  if (eventId === "evt_shared_demo_001") return "PFC-HUB-MO_001-DEMO";
  const mssv = (studentId || "000000").replace(/\W/g, "").slice(-6).toUpperCase();
  const ev = eventId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  return `PFC-HUB-${mssv}-${ev}`;
}

function modeLabel(mode: EventMeta["mode"]): string {
  if (mode === "online") return "Online";
  if (mode === "offline") return "Offline";
  if (mode === "hybrid") return "Hybrid (Online + Offline)";
  return "Offline";
}

function cors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CSS = `
:root {
  --ink: #1e1633; --muted: #6b6280; --line: #e5e0f0;
  --primary: #5b4a8a; --primary-soft: #efe9ff; --bg: #f7f5fb;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: var(--ink); background: var(--bg); }
.shell { max-width: 440px; margin: 0 auto; padding: 12px 14px 40px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.back {
  display: inline-flex; align-items: center; gap: 4px; color: var(--primary);
  text-decoration: none; font-size: 13px; font-weight: 650; background: #fff;
  border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; cursor: pointer;
}
.badge {
  display: inline-block; background: var(--primary-soft); color: #3d2e6b;
  padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
}
.banner {
  border-radius: 18px; padding: 22px 18px; color: #fff; margin-bottom: 14px;
  box-shadow: 0 10px 28px rgba(61,46,107,0.22);
}
.banner h1 { margin: 8px 0 6px; font-size: 1.35rem; line-height: 1.25; }
.banner .sub { opacity: 0.92; font-size: 13px; }
.card {
  background: #fff; border: 1px solid var(--line); border-radius: 16px;
  padding: 16px; margin-bottom: 12px;
}
.card h2 { margin: 0 0 10px; font-size: 1rem; }
.muted { color: var(--muted); font-size: 13px; }
.meta-row {
  display: grid; grid-template-columns: 22px 1fr; gap: 8px;
  align-items: start; margin: 8px 0; font-size: 13px;
}
label.field { display: block; font-size: 13px; font-weight: 650; margin-top: 10px; }
input {
  width: 100%; margin-top: 6px; padding: 11px 12px; border-radius: 12px;
  border: 1px solid var(--line); font: inherit; background: #fff;
}
.btn {
  display: block; width: 100%; text-align: center; text-decoration: none;
  border: none; border-radius: 12px; padding: 12px 14px; margin-top: 10px;
  font: inherit; font-weight: 700; cursor: pointer;
}
.btn:disabled { opacity: 0.65; cursor: wait; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-ghost { background: #fff; color: var(--primary); border: 1px solid var(--line); }
.btn-vnpay { background: #0f766e; color: #fff; }
.btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.qr-wrap { text-align: center; padding: 8px 0 4px; }
.qr-wrap img {
  width: 200px; height: 200px; border-radius: 14px;
  border: 1px solid var(--line); background: #fff;
}
.code {
  font-family: ui-monospace, Consolas, monospace; font-size: 1.05rem;
  font-weight: 750; letter-spacing: 1px; margin: 8px 0; word-break: break-all;
}
.ok-pill {
  display: inline-block; background: #ecfdf5; color: #047857;
  padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;
}
.footer-note { color: var(--muted); font-size: 11px; text-align: center; margin-top: 18px; }
.hidden { display: none !important; }
.list a.event-link { display: block; text-decoration: none; color: inherit; }
`;

function clientScript(ev: EventMeta & { id: string }): string {
  const club = CLUB_APP_URL;
  return `<script>
(function () {
  var isRegistered = false;
  var ticketState = null;
  var EVENT_ID = ${JSON.stringify(ev.id)};
  var EVENT_TITLE = ${JSON.stringify(ev.title)};
  var CLUB = ${JSON.stringify(club)};
  var DEMO_NAME = ${JSON.stringify(DEMO_HOLDER)};

  var formEl = document.getElementById("reg-form-card");
  var ticketEl = document.getElementById("ticket-card");
  var btnFree = document.getElementById("btn-free");
  var btnPay = document.getElementById("btn-vnpay");
  var errEl = document.getElementById("reg-error");

  function qs(name) {
    var el = document.querySelector('[name="' + name + '"]');
    return el ? String(el.value || "").trim() : "";
  }

  function setLoading(btn, on, label) {
    if (!btn) return;
    btn.disabled = !!on;
    btn.textContent = on ? "Đang xử lý…" : label;
  }

  function ticketCode(mssv) {
    if (EVENT_ID === "evt_shared_demo_001") return "PFC-HUB-MO_001-DEMO";
    var m = (mssv || "000000").replace(/\\W/g, "").slice(-6).toUpperCase() || "000000";
    var e = EVENT_ID.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
    return "PFC-HUB-" + m + "-" + e;
  }

  function showTicket(t) {
    isRegistered = true;
    ticketState = t;
    if (formEl) formEl.classList.add("hidden");
    if (ticketEl) ticketEl.classList.remove("hidden");
    document.getElementById("t-name").textContent = t.fullName;
    document.getElementById("t-code").textContent = t.code;
    document.getElementById("t-status").textContent = t.status;
    document.getElementById("t-mssv").textContent = t.studentId || "—";
    var qrPayload = t.studentId + "|" + t.eventId;
    var img = document.getElementById("t-qr");
    img.src = "/api/qr?data=" + encodeURIComponent(qrPayload);
    img.alt = "QR " + t.code;
    var dl = document.getElementById("t-download");
    if (dl) dl.href = img.src;
    try {
      localStorage.setItem("hub.ticket." + EVENT_ID, JSON.stringify(t));
    } catch (e) {}
    updateBackLinks();
  }

  function updateBackLinks() {
    var href = CLUB + "/events";
    if (ticketState) {
      var payload = btoa(unescape(encodeURIComponent(JSON.stringify({
        eventId: ticketState.eventId,
        title: ticketState.title,
        code: ticketState.code,
        fullName: ticketState.fullName,
        studentId: ticketState.studentId,
        status: ticketState.status,
        payMethod: ticketState.payMethod,
        issuedAt: ticketState.issuedAt
      }))));
      href = CLUB + "/events?hubTicket=" + encodeURIComponent(payload);
    }
    document.querySelectorAll("[data-back-club]").forEach(function (a) {
      a.setAttribute("href", href);
    });
  }

  async function register(payMethod, btn, idleLabel) {
    if (errEl) errEl.textContent = "";
    var fullName = qs("fullName") || DEMO_NAME;
    var email = qs("email");
    var studentId = qs("studentId");
    if (!email) {
      if (errEl) errEl.textContent = "Vui lòng nhập Email.";
      return;
    }
    if (!studentId) {
      if (errEl) errEl.textContent = "Vui lòng nhập MSSV (dùng để sinh QR).";
      return;
    }
    setLoading(btnFree, true, "Đăng ký miễn phí");
    setLoading(btnPay, true, "Thanh toán VNPAY (Mô phỏng)");
    setLoading(btn, true, idleLabel);
    await new Promise(function (r) { setTimeout(r, 1000); });
    var t = {
      eventId: EVENT_ID,
      title: EVENT_TITLE,
      fullName: DEMO_NAME,
      email: email,
      studentId: studentId,
      payMethod: payMethod,
      code: ticketCode(studentId),
      status: "Đã xác nhận",
      issuedAt: new Date().toISOString()
    };
    showTicket(t);
    setLoading(btnFree, false, "Đăng ký miễn phí");
    setLoading(btnPay, false, "Thanh toán VNPAY (Mô phỏng)");
  }

  if (btnFree) btnFree.addEventListener("click", function (e) {
    e.preventDefault();
    register("free", btnFree, "Đăng ký miễn phí");
  });
  if (btnPay) btnPay.addEventListener("click", function (e) {
    e.preventDefault();
    register("vnpay", btnPay, "Thanh toán VNPAY (Mô phỏng)");
  });

  try {
    var saved = localStorage.getItem("hub.ticket." + EVENT_ID);
    if (saved) showTicket(JSON.parse(saved));
  } catch (e) {}
  updateBackLinks();
})();
</script>`;
}

function layout(title: string, body: string, script = "") {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Event Hub</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <a class="back" data-back-club href="${CLUB_APP_URL}/events">← Quay lại PFC Club App</a>
      <span class="badge">Hub :${PORT}</span>
    </div>
    ${body}
    <p class="footer-note">Shared Event Hub stub (ADR-008) — demo ticketing / VNPAY mô phỏng.</p>
    <p style="text-align:center;margin-top:10px">
      <a class="back" data-back-club href="${CLUB_APP_URL}/events">← Quay lại PFC Club App</a>
    </p>
  </div>
  ${script}
</body>
</html>`;
}

function eventBanner(ev: EventMeta & { id: string }) {
  return `<div class="banner" style="background:${ev.bannerGradient}">
    <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff">Shared Event</span>
    <h1>${escapeHtml(ev.title)}</h1>
    <div class="sub">${escapeHtml(modeLabel(ev.mode))} · ${escapeHtml(ev.status)}</div>
  </div>`;
}

function eventDetailsCard(ev: EventMeta & { id: string }) {
  return `<div class="card">
    <h2>Chi tiết sự kiện</h2>
    <div class="meta-row"><span>🕒</span><div><strong>Thời gian</strong><br/>${escapeHtml(ev.timeLabel)}</div></div>
    <div class="meta-row"><span>📍</span><div><strong>Địa điểm (${escapeHtml(modeLabel(ev.mode))})</strong><br/>${escapeHtml(ev.venue)}</div></div>
    <div class="meta-row"><span>ℹ️</span><div><strong>Mô tả</strong><br/>${escapeHtml(ev.description)}</div></div>
    <p class="muted" style="margin:10px 0 0">ID: <code>${escapeHtml(ev.id)}</code></p>
  </div>`;
}

function interactiveRegisterBlock(ev: EventMeta & { id: string }) {
  return `
<div class="card" id="reg-form-card">
  <h2>Đăng ký / Mua vé</h2>
  <p class="muted" style="margin-top:0">Điền thông tin để nhận QR Ticket (demo Hub).</p>
  <p id="reg-error" style="color:#e11d48;font-size:13px;min-height:1.2em"></p>
  <label class="field">Họ và tên
    <input name="fullName" value="${escapeHtml(DEMO_HOLDER)}" autocomplete="name" />
  </label>
  <label class="field">Email
    <input name="email" type="email" required placeholder="ban@pfc.vn" autocomplete="email" />
  </label>
  <label class="field">MSSV
    <input name="studentId" required placeholder="21520000" autocomplete="off" />
  </label>
  <button class="btn btn-primary" type="button" id="btn-free">Đăng ký miễn phí</button>
  <button class="btn btn-vnpay" type="button" id="btn-vnpay">Thanh toán VNPAY (Mô phỏng)</button>
</div>
<div class="card hidden" id="ticket-card">
  <h2>Vé của tôi (QR Ticket)</h2>
  <p style="margin:0 0 6px"><strong>Họ tên:</strong> <span id="t-name">${escapeHtml(DEMO_HOLDER)}</span></p>
  <p style="margin:0 0 6px"><strong>MSSV:</strong> <span id="t-mssv">—</span></p>
  <p style="margin:0 0 6px"><strong>Loại vé:</strong> <span class="ok-pill" id="t-status">Đã xác nhận</span></p>
  <div class="qr-wrap">
    <img id="t-qr" width="200" height="200" alt="QR Ticket" />
    <div class="code" id="t-code">—</div>
    <p class="muted">QR sinh từ MSSV + ID sự kiện</p>
  </div>
  <div class="btn-row">
    <a class="btn btn-ghost" id="t-download" download="pfc-ticket.png" href="#">Tải vé về máy</a>
    <a class="btn btn-ghost" data-back-club href="${CLUB_APP_URL}/events">Đồng bộ về Club</a>
  </div>
</div>`;
}

function renderEventPage(ev: EventMeta & { id: string }, action: string): string {
  const banner = eventBanner(ev);
  const details = eventDetailsCard(ev);
  const interactive =
    action === "register" ||
    action === "tickets" ||
    action === "tickets/mine" ||
    action === "detail";

  if (action === "check-in") {
    return layout(
      `Check-in · ${ev.title}`,
      `${banner}${details}<div class="card"><h2>Điểm danh Ban tổ chức</h2><p class="muted">Quét QR vé (MSSV|eventId) tại cổng.</p><a class="btn btn-primary" href="/events/${encodeURIComponent(ev.id)}/register">Mở đăng ký / vé</a></div>`,
    );
  }

  if (interactive) {
    return layout(
      ev.title,
      `${banner}${details}${interactiveRegisterBlock(ev)}`,
      clientScript(ev),
    );
  }

  return layout(ev.title, `${banner}${details}`);
}

function listPage(): string {
  const ids = [...Object.keys(DEMO), "smoke-evt-demo"];
  const items = ids
    .map((id) => {
      const ev = resolveEvent(id);
      return `<a class="event-link" href="/events/${encodeURIComponent(id)}/register"><div class="card">
        <div class="badge">${escapeHtml(modeLabel(ev.mode))}</div>
        <h2 style="margin-top:8px">${escapeHtml(ev.title)}</h2>
        <p class="muted" style="margin:0">${escapeHtml(ev.timeLabel)} · ${escapeHtml(ev.venue)}</p>
        <p class="muted" style="margin:4px 0 0">ID: ${escapeHtml(id)}</p>
      </div></a>`;
    })
    .join("");
  return layout(
    "Sự kiện",
    `<h1 style="font-size:1.25rem;margin:4px 0 12px">Shared Event Hub</h1>
     <p class="muted">Danh sách sự kiện demo — deep-link từ PFC Club.</p>
     <div class="list">${items}</div>`,
  );
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/health" || url.pathname === "/") {
    if (url.pathname === "/" && (req.headers.accept || "").includes("text/html")) {
      res.writeHead(302, { Location: "/events" });
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "event-hub-stub", port: PORT }));
    return;
  }

  if (url.pathname === "/api/qr") {
    const data = url.searchParams.get("data") || "PFC";
    try {
      const png = await QRCode.toBuffer(data, {
        type: "png",
        width: 280,
        margin: 2,
        color: { dark: "#3d2e6b", light: "#ffffff" },
      });
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      });
      res.end(png);
    } catch {
      res.writeHead(400);
      res.end("bad qr");
    }
    return;
  }

  if (url.pathname === "/api/v1/events/batch") {
    const ids = (url.searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const events = (ids.length ? ids : Object.keys(DEMO)).map((id) => {
      const e = resolveEvent(id);
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        mode: e.mode,
        startsAt: e.startsAt,
      };
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ events }));
    return;
  }

  if (url.pathname === "/events" || url.pathname === "/events/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(listPage());
    return;
  }

  const m = url.pathname.match(
    /^\/events\/([^/]+)(?:\/(register|tickets|tickets\/mine|check-in))?\/?$/,
  );
  if (!m) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      layout(
        "Not found",
        `<div class="card"><p>Không có route <code>${escapeHtml(url.pathname)}</code></p><a class="btn btn-primary" href="/events">Danh sách</a></div>`,
      ),
    );
    return;
  }

  const eventId = decodeURIComponent(m[1]);
  const action = m[2] ?? "detail";
  const ev = resolveEvent(eventId);
  const html = renderEventPage(ev, action);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(PORT, HOST, () => {
  console.log(`[event-hub-stub] http://${HOST}:${PORT}/events`);
  console.log(`[event-hub-stub] Club sync → ${CLUB_APP_URL}/events?hubTicket=…`);
});
