"""
Chạy backtest CLI.

  python main.py
  python main.py rsi
  python main.py sma
"""

from __future__ import annotations

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from runner import run_strategy_backtest
from strategy.registry import list_strategies


def _fmt(n: float) -> str:
    return f"{n:,.0f} VND"


def main() -> None:
    strategy_id = (sys.argv[1] if len(sys.argv) > 1 else "sma").strip().lower()
    known = {s["id"] for s in list_strategies()}
    if strategy_id not in known:
        print(f"Chiến lược không hợp lệ: {strategy_id}")
        print("Có sẵn:", ", ".join(sorted(known)))
        sys.exit(1)

    print(f"Đang chạy backtest strategy={strategy_id} ...")
    payload = run_strategy_backtest(strategy_id)
    m = payload["metrics"]
    s = payload["strategy"]

    print("\n" + "=" * 60)
    print(f" KẾT QUẢ — {payload['symbol']} | {s['name']}")
    print("=" * 60)
    print(f" {s['description']}")
    print(f" Kỳ: {m['start']} → {m['end']}")
    print("-" * 60)
    print(f" Vốn đầu/cuối : {_fmt(m['initial_capital'])} → {_fmt(m['final_equity'])}")
    print(f" Lãi/Lỗ       : {_fmt(m['net_profit'])} ({m['total_return_pct']:.2f}%)")
    print(f" Max DD       : {m['max_drawdown_pct']:.2f}%")
    print(f" Win rate     : {m['win_rate_pct']:.1f}% | Lệnh: {m['trades']}")
    print("=" * 60)
    print(f"Biểu đồ : {payload['chart_url']}")
    print(f"Lệnh CSV: {payload['trades_csv_url']}")


if __name__ == "__main__":
    main()
