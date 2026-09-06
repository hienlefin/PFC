"""Hiển thị và xuất kết quả backtest."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from backtest.engine import BacktestResult
from config import OUTPUT_DIR

INDICATOR_STYLES = {
    "sma_fast": ("#e67e22", "SMA nhanh"),
    "sma_slow": ("#8e44ad", "SMA chậm"),
    "rsi": ("#2980b9", "RSI"),
}


def _fmt_vnd(value: float) -> str:
    return f"{value:,.0f} VND"


def print_report(
    result: BacktestResult,
    symbol: str,
    strategy_name: str,
    strategy_desc: str,
) -> None:
    m = result.metrics
    print("\n" + "=" * 60)
    print(f" KẾT QUẢ BACKTEST — {symbol}")
    print("=" * 60)
    print(f" Chiến lược : {strategy_name}")
    print(f" Mô tả      : {strategy_desc}")
    print(f" Thời gian  : {m['start']} → {m['end']}")
    print("-" * 60)
    print(f" Vốn ban đầu     : {_fmt_vnd(m['initial_capital'])}")
    print(f" Vốn cuối        : {_fmt_vnd(m['final_equity'])}")
    print(f" Lãi/Lỗ ròng     : {_fmt_vnd(m['net_profit'])}")
    print(f" Tổng lợi nhuận  : {m['total_return_pct']:.2f}%")
    print(f" CAGR            : {m['cagr_pct']:.2f}%")
    print(f" Max Drawdown    : {m['max_drawdown_pct']:.2f}%")
    print(f" Sharpe (ann.)   : {m['sharpe']:.2f}")
    print("-" * 60)
    print(f" Số lệnh         : {m['trades']}")
    print(f" Win rate        : {m['win_rate_pct']:.1f}%")
    print(f" Lãi TB / lệnh   : {_fmt_vnd(m['avg_win'])}")
    print(f" Lỗ TB / lệnh    : {_fmt_vnd(m['avg_loss'])}")
    pf = m["profit_factor"]
    print(f" Profit factor   : {'∞' if pf is None else f'{pf:.2f}'}")
    print("=" * 60)

    if result.trades:
        print("\n10 lệnh gần nhất:")
        print(
            f"{'Vào':<12}{'Ra':<12}{'Hướng':<7}{'Entry':>8}{'Exit':>8}{'Điểm':>8}{'Net PnL':>16}"
        )
        for t in result.trades[-10:]:
            print(
                f"{str(t.entry_date.date()):<12}"
                f"{str(t.exit_date.date()):<12}"
                f"{t.side:<7}"
                f"{t.entry_price:>8.1f}"
                f"{t.exit_price:>8.1f}"
                f"{t.points:>8.1f}"
                f"{t.net_pnl:>16,.0f}"
            )


def plot_results(
    result: BacktestResult,
    symbol: str,
    strategy_id: str,
    strategy_name: str,
    indicator_cols: list[str] | None = None,
) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    eq = result.equity_curve
    indicator_cols = indicator_cols or []
    price_inds = [c for c in indicator_cols if c != "rsi"]
    has_rsi = "rsi" in indicator_cols and "rsi" in eq.columns

    n_rows = 3 + (1 if has_rsi else 0)
    ratios = [2.2, 1.0] if has_rsi else [2.2]
    ratios += [1.4, 1]
    fig, axes = plt.subplots(
        n_rows, 1, figsize=(12, 3.2 * n_rows), sharex=True, gridspec_kw={"height_ratios": ratios}
    )
    fig.suptitle(f"Backtest {symbol} — {strategy_name}", fontsize=14, fontweight="bold")

    ax0 = axes[0]
    ax0.plot(eq.index, eq["close"], color="#1f4e79", lw=1.2, label="Giá đóng cửa")
    for col in price_inds:
        if col in eq.columns:
            color, label = INDICATOR_STYLES.get(col, ("#7f8c8d", col))
            ax0.plot(eq.index, eq[col], color=color, lw=1.0, label=label)

    long_entries = [(t.entry_date, t.entry_price) for t in result.trades if t.side == "LONG"]
    short_entries = [(t.entry_date, t.entry_price) for t in result.trades if t.side == "SHORT"]
    if long_entries:
        xs, ys = zip(*long_entries)
        ax0.scatter(xs, ys, marker="^", color="#27ae60", s=40, zorder=5, label="Long")
    if short_entries:
        xs, ys = zip(*short_entries)
        ax0.scatter(xs, ys, marker="v", color="#c0392b", s=40, zorder=5, label="Short")
    ax0.set_ylabel("Điểm VN30F")
    ax0.legend(loc="upper left", fontsize=8)
    ax0.grid(True, alpha=0.3)

    idx = 1
    if has_rsi:
        ax_rsi = axes[idx]
        ax_rsi.plot(eq.index, eq["rsi"], color="#2980b9", lw=1.1, label="RSI")
        ax_rsi.axhline(70, color="#c0392b", ls="--", lw=0.8)
        ax_rsi.axhline(30, color="#27ae60", ls="--", lw=0.8)
        ax_rsi.set_ylabel("RSI")
        ax_rsi.set_ylim(0, 100)
        ax_rsi.grid(True, alpha=0.3)
        idx += 1

    ax_eq = axes[idx]
    ax_eq.plot(eq.index, eq["equity"] / 1e6, color="#0e6655", lw=1.4)
    ax_eq.fill_between(eq.index, eq["equity"] / 1e6, alpha=0.15, color="#0e6655")
    ax_eq.set_ylabel("Equity (triệu VND)")
    ax_eq.grid(True, alpha=0.3)

    ax_pos = axes[idx + 1]
    ax_pos.step(eq.index, eq["signal"], where="post", color="#2c3e50", lw=1.0)
    ax_pos.set_ylabel("Vị thế")
    ax_pos.set_yticks([-1, 0, 1])
    ax_pos.set_yticklabels(["Short", "Flat", "Long"])
    ax_pos.grid(True, alpha=0.3)

    fig.tight_layout()
    out = OUTPUT_DIR / f"{symbol}_{strategy_id}_backtest.png"
    fig.savefig(out, dpi=140)
    plt.close(fig)
    return out


def export_trades_csv(result: BacktestResult, symbol: str, strategy_id: str) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = [
        {
            "entry_date": t.entry_date.date().isoformat(),
            "exit_date": t.exit_date.date().isoformat(),
            "side": t.side,
            "contracts": t.contracts,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "points": round(t.points, 2),
            "pnl": round(t.pnl),
            "fee": round(t.fee),
            "net_pnl": round(t.net_pnl),
        }
        for t in result.trades
    ]
    path = OUTPUT_DIR / f"{symbol}_{strategy_id}_trades.csv"
    pd.DataFrame(rows).to_csv(path, index=False, encoding="utf-8-sig")
    return path
