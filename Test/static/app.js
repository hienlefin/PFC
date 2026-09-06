const strategySelect = document.getElementById("strategy");
const strategyDesc = document.getElementById("strategyDesc");
const runBtn = document.getElementById("runBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const metricsEl = document.getElementById("metrics");
const chartEl = document.getElementById("chart");
const tradesBody = document.getElementById("tradesBody");

let strategies = [];

function fmtVnd(n) {
  return `${Math.round(n).toLocaleString("vi-VN")} ₫`;
}

function fmtPct(n) {
  return `${Number(n).toFixed(2)}%`;
}

function setStatus(text, isError = false) {
  statusEl.hidden = !text;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", isError);
}

function updateDescription() {
  const selected = strategies.find((s) => s.id === strategySelect.value);
  strategyDesc.textContent = selected ? selected.description : "";
}

function metricCard(label, value, tone = "") {
  const toneClass = tone ? ` ${tone}` : "";
  return `<div class="metric"><div class="label">${label}</div><div class="value${toneClass}">${value}</div></div>`;
}

function renderResults(data) {
  const m = data.metrics;
  const tone = m.net_profit >= 0 ? "pos" : "neg";
  const pf = m.profit_factor == null ? "∞" : Number(m.profit_factor).toFixed(2);

  metricsEl.innerHTML = [
    metricCard("Vốn đầu", fmtVnd(m.initial_capital)),
    metricCard("Vốn cuối", fmtVnd(m.final_equity), tone),
    metricCard("Lãi/Lỗ", fmtVnd(m.net_profit), tone),
    metricCard("Lợi nhuận", fmtPct(m.total_return_pct), tone),
    metricCard("Max DD", fmtPct(m.max_drawdown_pct), "neg"),
    metricCard("Win rate", fmtPct(m.win_rate_pct)),
    metricCard("Số lệnh", String(m.trades)),
    metricCard("Profit factor", pf),
  ].join("");

  chartEl.src = `${data.chart_url}?t=${Date.now()}`;
  tradesBody.innerHTML = data.trades
    .map(
      (t) => `<tr>
        <td>${t.entry_date}</td>
        <td>${t.exit_date}</td>
        <td>${t.side}</td>
        <td>${t.entry_price.toFixed(1)}</td>
        <td>${t.exit_price.toFixed(1)}</td>
        <td>${t.points.toFixed(1)}</td>
        <td>${fmtVnd(t.net_pnl)}</td>
      </tr>`
    )
    .join("");

  resultsEl.hidden = false;
}

async function loadStrategies() {
  const res = await fetch("/api/strategies");
  if (!res.ok) throw new Error("Không tải được danh sách chiến lược");
  const data = await res.json();
  strategies = data.strategies || [];
  strategySelect.innerHTML = strategies
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join("");
  updateDescription();
}

async function runBacktest() {
  const id = strategySelect.value;
  if (!id) return;

  runBtn.disabled = true;
  resultsEl.hidden = true;
  setStatus("Đang tải dữ liệu và chạy backtest...");

  try {
    const res = await fetch(`/api/backtest/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Backtest thất bại");
    renderResults(data);
    setStatus(
      `${data.strategy.name} · ${data.symbol} · ${data.metrics.start} → ${data.metrics.end}`
    );
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    runBtn.disabled = false;
  }
}

strategySelect.addEventListener("change", updateDescription);
runBtn.addEventListener("click", runBacktest);

loadStrategies()
  .then(runBacktest)
  .catch((err) => setStatus(err.message || String(err), true));
