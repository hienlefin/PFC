"""Chạy backtest theo strategy_id và trả payload cho API/CLI."""

from __future__ import annotations

from typing import Any

from backtest.engine import run_backtest
from config import END_DATE, START_DATE, SYMBOL
from data.fetcher import fetch_ohlcv
from report import export_trades_csv, plot_results
from strategy.registry import get_strategy


def run_strategy_backtest(
    strategy_id: str,
    *,
    use_cache: bool = True,
) -> dict[str, Any]:
    meta = get_strategy(strategy_id)
    ohlcv = fetch_ohlcv(symbol=SYMBOL, start=START_DATE, end=END_DATE, use_cache=use_cache)
    signaled = meta["generate"](ohlcv)
    result = run_backtest(signaled)

    chart = plot_results(
        result,
        SYMBOL,
        strategy_id=meta["id"],
        strategy_name=meta["name"],
        indicator_cols=meta["indicator_cols"],
    )
    trades_csv = export_trades_csv(result, SYMBOL, meta["id"])

    eq = result.equity_curve
    equity_series = []
    for idx, row in eq.iterrows():
        point = {
            "date": idx.strftime("%Y-%m-%d"),
            "close": float(row["close"]),
            "equity": float(row["equity"]),
            "signal": int(row["signal"]),
        }
        for col in meta["indicator_cols"]:
            if col not in eq.columns:
                continue
            val = row[col]
            point[col] = None if val is None or (isinstance(val, float) and val != val) else float(val)
        equity_series.append(point)

    trades = [
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

    return {
        "symbol": SYMBOL,
        "strategy": {
            "id": meta["id"],
            "name": meta["name"],
            "description": meta["description"],
        },
        "metrics": result.metrics,
        "equity_curve": equity_series,
        "trades": trades,
        "chart_url": f"/output/{chart.name}",
        "trades_csv_url": f"/output/{trades_csv.name}",
    }
