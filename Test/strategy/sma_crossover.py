"""
Chiến lược SMA Crossover cho phái sinh VN30.

Tín hiệu:
- SMA nhanh cắt lên SMA chậm  -> LONG (+1)
- SMA nhanh cắt xuống SMA chậm -> SHORT (-1)
- Giữ nguyên vị thế cho đến tín hiệu đối ứng
"""

from __future__ import annotations

import pandas as pd

from config import FAST_MA, SLOW_MA

STRATEGY_ID = "sma"
STRATEGY_NAME = "SMA Crossover"
STRATEGY_DESC = (
    f"Mua (Long) khi SMA{FAST_MA} cắt lên SMA{SLOW_MA}; "
    f"Bán khống (Short) khi SMA{FAST_MA} cắt xuống SMA{SLOW_MA}."
)
INDICATOR_COLS = ["sma_fast", "sma_slow"]


def generate_signals(
    ohlcv: pd.DataFrame,
    fast: int = FAST_MA,
    slow: int = SLOW_MA,
) -> pd.DataFrame:
    if slow <= fast:
        raise ValueError("SLOW_MA phải lớn hơn FAST_MA")
    if len(ohlcv) < slow + 2:
        raise ValueError(f"Cần ít nhất {slow + 2} phiên để chạy chiến lược")

    df = ohlcv.copy()
    df["sma_fast"] = df["close"].rolling(fast).mean()
    df["sma_slow"] = df["close"].rolling(slow).mean()

    raw = (df["sma_fast"] > df["sma_slow"]).astype(int) - (
        df["sma_fast"] < df["sma_slow"]
    ).astype(int)
    position = raw.where(raw != 0).ffill()
    position = position.where(df["sma_slow"].notna())

    df["signal"] = position
    df["trade"] = df["signal"].diff().fillna(0)
    return df
