"""
Engine backtest đơn giản cho hợp đồng tương lai VN30.

Giả định:
- Giao dịch tại giá close của phiên có tín hiệu đổi vị thế
- Luôn giữ đúng MAX_CONTRACTS hợp đồng theo hướng tín hiệu
- PnL theo điểm * MULTIPLIER * số HĐ
- Trừ phí mỗi lần mở/đóng
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from config import (
    FEE_PER_SIDE,
    INITIAL_CAPITAL,
    INITIAL_MARGIN_PER_CONTRACT,
    MAX_CONTRACTS,
    MULTIPLIER,
)


@dataclass
class Trade:
    entry_date: pd.Timestamp
    exit_date: pd.Timestamp
    side: str
    contracts: int
    entry_price: float
    exit_price: float
    points: float
    pnl: float
    fee: float
    net_pnl: float


@dataclass
class BacktestResult:
    equity_curve: pd.DataFrame
    trades: list[Trade]
    metrics: dict[str, Any] = field(default_factory=dict)


def _side_name(pos: int) -> str:
    if pos > 0:
        return "LONG"
    if pos < 0:
        return "SHORT"
    return "FLAT"


def run_backtest(
    signal_df: pd.DataFrame,
    initial_capital: float = INITIAL_CAPITAL,
    contracts: int = MAX_CONTRACTS,
    multiplier: float = MULTIPLIER,
    fee_per_side: float = FEE_PER_SIDE,
    margin_per_contract: float = INITIAL_MARGIN_PER_CONTRACT,
) -> BacktestResult:
    if "signal" not in signal_df.columns:
        raise ValueError("Thiếu cột signal trong dữ liệu chiến lược")

    df = signal_df.dropna(subset=["signal"]).copy()
    df["signal"] = df["signal"].astype(int)
    if df.empty:
        raise ValueError("Không còn dữ liệu sau khi loại bỏ NaN chỉ báo")

    skip = {"open", "high", "low", "close", "volume", "signal", "trade"}
    indicator_cols = [c for c in df.columns if c not in skip]

    required_margin = margin_per_contract * contracts
    if required_margin > initial_capital:
        raise ValueError(
            f"Vốn {initial_capital:,.0f} không đủ ký quỹ tối thiểu {required_margin:,.0f}"
        )

    cash = float(initial_capital)
    position = 0  # -1 short, 0 flat, +1 long
    entry_price = 0.0
    entry_date: pd.Timestamp | None = None
    trades: list[Trade] = []
    rows: list[dict[str, Any]] = []

    for dt, row in df.iterrows():
        target = int(row["signal"])
        price = float(row["close"])
        realized = 0.0
        fee_today = 0.0

        if target != position:
            # Đóng vị thế cũ
            if position != 0 and entry_date is not None:
                points = (price - entry_price) * position
                gross = points * multiplier * contracts
                fee = fee_per_side * contracts  # đóng
                net = gross - fee
                cash += net
                realized += net
                fee_today += fee
                trades.append(
                    Trade(
                        entry_date=entry_date,
                        exit_date=dt,
                        side=_side_name(position),
                        contracts=contracts,
                        entry_price=entry_price,
                        exit_price=price,
                        points=points,
                        pnl=gross,
                        fee=fee + fee_per_side * contracts,  # gồm phí mở đã trừ trước
                        net_pnl=gross - (fee + fee_per_side * contracts),
                    )
                )

            # Mở vị thế mới
            if target != 0:
                open_fee = fee_per_side * contracts
                cash -= open_fee
                fee_today += open_fee
                entry_price = price
                entry_date = dt
            else:
                entry_price = 0.0
                entry_date = None

            position = target

        # Unrealized PnL theo mark-to-market
        unrealized = 0.0
        if position != 0:
            unrealized = (price - entry_price) * position * multiplier * contracts

        equity = cash + unrealized
        entry: dict[str, Any] = {
            "date": dt,
            "close": price,
            "signal": position,
            "cash": cash,
            "unrealized": unrealized,
            "equity": equity,
            "realized_today": realized,
            "fee_today": fee_today,
        }
        for col in indicator_cols:
            val = row[col]
            entry[col] = float(val) if pd.notna(val) else None
        rows.append(entry)

    # Đóng vị thế cuối kỳ để chốt equity
    if position != 0 and entry_date is not None and rows:
        last = df.iloc[-1]
        price = float(last["close"])
        dt = df.index[-1]
        points = (price - entry_price) * position
        gross = points * multiplier * contracts
        fee = fee_per_side * contracts
        cash += gross - fee
        trades.append(
            Trade(
                entry_date=entry_date,
                exit_date=dt,
                side=_side_name(position),
                contracts=contracts,
                entry_price=entry_price,
                exit_price=price,
                points=points,
                pnl=gross,
                fee=fee + fee_per_side * contracts,
                net_pnl=gross - (fee + fee_per_side * contracts),
            )
        )
        rows[-1]["cash"] = cash
        rows[-1]["unrealized"] = 0.0
        rows[-1]["equity"] = cash
        rows[-1]["signal"] = 0

    equity_curve = pd.DataFrame(rows).set_index("date")
    metrics = compute_metrics(equity_curve, trades, initial_capital)
    return BacktestResult(equity_curve=equity_curve, trades=trades, metrics=metrics)


def compute_metrics(
    equity: pd.DataFrame,
    trades: list[Trade],
    initial_capital: float,
) -> dict[str, Any]:
    eq = equity["equity"].astype(float)
    rets = eq.pct_change().dropna()
    total_return = (eq.iloc[-1] / initial_capital - 1.0) * 100
    days = max((eq.index[-1] - eq.index[0]).days, 1)
    years = days / 365.25
    cagr = ((eq.iloc[-1] / initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0.0

    peak = eq.cummax()
    drawdown = (eq - peak) / peak
    max_dd = float(drawdown.min() * 100)

    wins = [t for t in trades if t.net_pnl > 0]
    losses = [t for t in trades if t.net_pnl <= 0]
    win_rate = (len(wins) / len(trades) * 100) if trades else 0.0
    avg_win = float(np.mean([t.net_pnl for t in wins])) if wins else 0.0
    avg_loss = float(np.mean([t.net_pnl for t in losses])) if losses else 0.0
    profit_factor = (
        abs(sum(t.net_pnl for t in wins) / sum(t.net_pnl for t in losses))
        if losses and sum(t.net_pnl for t in losses) != 0
        else float("inf") if wins else 0.0
    )
    sharpe = (
        float(np.sqrt(252) * rets.mean() / rets.std())
        if len(rets) > 1 and rets.std() != 0
        else 0.0
    )

    return {
        "initial_capital": initial_capital,
        "final_equity": float(eq.iloc[-1]),
        "net_profit": float(eq.iloc[-1] - initial_capital),
        "total_return_pct": float(total_return),
        "cagr_pct": float(cagr),
        "max_drawdown_pct": float(max_dd),
        "sharpe": sharpe,
        "trades": len(trades),
        "win_rate_pct": float(win_rate),
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "profit_factor": float(profit_factor) if profit_factor != float("inf") else None,
        "start": str(eq.index[0].date()),
        "end": str(eq.index[-1].date()),
    }
