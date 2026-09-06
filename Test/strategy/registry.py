"""Đăng ký các chiến lược backtest."""

from __future__ import annotations

from typing import Any, Callable

import pandas as pd

from strategy import rsi_mean_reversion, sma_crossover

SignalFn = Callable[[pd.DataFrame], pd.DataFrame]


STRATEGIES: dict[str, dict[str, Any]] = {
    sma_crossover.STRATEGY_ID: {
        "id": sma_crossover.STRATEGY_ID,
        "name": sma_crossover.STRATEGY_NAME,
        "description": sma_crossover.STRATEGY_DESC,
        "indicator_cols": sma_crossover.INDICATOR_COLS,
        "generate": sma_crossover.generate_signals,
    },
    rsi_mean_reversion.STRATEGY_ID: {
        "id": rsi_mean_reversion.STRATEGY_ID,
        "name": rsi_mean_reversion.STRATEGY_NAME,
        "description": rsi_mean_reversion.STRATEGY_DESC,
        "indicator_cols": rsi_mean_reversion.INDICATOR_COLS,
        "generate": rsi_mean_reversion.generate_signals,
    },
}


def list_strategies() -> list[dict[str, str]]:
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "description": s["description"],
        }
        for s in STRATEGIES.values()
    ]


def get_strategy(strategy_id: str) -> dict[str, Any]:
    if strategy_id not in STRATEGIES:
        known = ", ".join(STRATEGIES)
        raise KeyError(f"Không tìm thấy chiến lược '{strategy_id}'. Có: {known}")
    return STRATEGIES[strategy_id]
