"""
Chiến lược RSI Mean Reversion dùng talib.RSI.

Tín hiệu:
- RSI < oversold  -> LONG  (quá bán, kỳ vọng hồi)
- RSI > overbought -> SHORT (quá mua, kỳ vọng giảm)
- Vùng giữa       -> giữ vị thế trước đó
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import talib

from config import RSI_OVERBOUGHT, RSI_OVERSOLD, RSI_PERIOD

STRATEGY_ID = "rsi"
STRATEGY_NAME = "RSI Mean Reversion"
STRATEGY_DESC = (
    f"Long khi RSI({RSI_PERIOD}) < {RSI_OVERSOLD}; "
    f"Short khi RSI({RSI_PERIOD}) > {RSI_OVERBOUGHT} "
    f"(dùng TA-Lib RSI)."
)
INDICATOR_COLS = ["rsi"]


def generate_signals(
    ohlcv: pd.DataFrame,
    period: int = RSI_PERIOD,
    oversold: float = RSI_OVERSOLD,
    overbought: float = RSI_OVERBOUGHT,
) -> pd.DataFrame:
    if oversold >= overbought:
        raise ValueError("RSI_OVERSOLD phải nhỏ hơn RSI_OVERBOUGHT")
    if len(ohlcv) < period + 2:
        raise ValueError(f"Cần ít nhất {period + 2} phiên để chạy RSI")

    df = ohlcv.copy()
    close = np.asarray(df["close"], dtype=float)
    df["rsi"] = talib.RSI(close, timeperiod=period)

    raw = pd.Series(0, index=df.index, dtype=float)
    raw = raw.mask(df["rsi"] < oversold, 1)
    raw = raw.mask(df["rsi"] > overbought, -1)
    # Giữ vị thế cũ trong vùng trung tính; warmup RSI = NaN
    position = raw.where(raw != 0).ffill()
    position = position.where(df["rsi"].notna())

    df["signal"] = position
    df["trade"] = df["signal"].diff().fillna(0)
    return df
