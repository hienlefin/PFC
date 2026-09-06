"""Tải dữ liệu OHLCV phái sinh từ API chart công khai (VNDIRECT / SSI)."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

from config import DATA_CACHE_DIR, END_DATE, START_DATE, SYMBOL

VNDIRECT_URL = "https://dchart-api.vndirect.com.vn/dchart/history"
SSI_URL = "https://iboard.ssi.com.vn/dchart/api/history"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
}


def _to_unix(day: str | date | None, end_of_day: bool = False) -> int:
    if day is None:
        dt = datetime.now(timezone.utc)
    elif isinstance(day, date) and not isinstance(day, datetime):
        dt = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    else:
        dt = datetime.strptime(str(day), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if end_of_day:
        dt = dt.replace(hour=23, minute=59, second=59)
    return int(dt.timestamp())


def _parse_history(payload: dict) -> pd.DataFrame:
    if not payload:
        raise ValueError("Phản hồi API rỗng")

    status = payload.get("s")
    if status == "no_data" or (status is None and not payload.get("t")):
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
    if status not in (None, "ok") and not payload.get("t"):
        raise ValueError(f"Phản hồi API không hợp lệ: status={status}")
    if not payload.get("t"):
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

    df = pd.DataFrame(
        {
            "time": payload["t"],
            "open": payload["o"],
            "high": payload["h"],
            "low": payload["l"],
            "close": payload["c"],
            "volume": payload.get("v", [0] * len(payload["t"])),
        }
    )
    df["date"] = (
        pd.to_datetime(df["time"], unit="s", utc=True)
        .dt.tz_convert("Asia/Ho_Chi_Minh")
        .dt.tz_localize(None)
        .dt.normalize()
    )
    df = df.drop(columns=["time"]).set_index("date").sort_index()
    df = df[~df.index.duplicated(keep="last")]
    return df.astype(float)


def _fetch_vndirect(symbol: str, start: str, end: Optional[str]) -> pd.DataFrame:
    params = {
        "symbol": symbol,
        "resolution": "D",
        "from": _to_unix(start),
        "to": _to_unix(end, end_of_day=True),
    }
    headers = {
        **HEADERS,
        "Referer": "https://dchart.vndirect.com.vn/",
        "Origin": "https://dchart.vndirect.com.vn",
    }
    resp = requests.get(VNDIRECT_URL, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    return _parse_history(resp.json())


def _fetch_ssi(symbol: str, start: str, end: Optional[str]) -> pd.DataFrame:
    params = {
        "symbol": symbol,
        "resolution": "1D",
        "from": _to_unix(start),
        "to": _to_unix(end, end_of_day=True),
    }
    headers = {
        **HEADERS,
        "Referer": "https://iboard.ssi.com.vn/",
        "Origin": "https://iboard.ssi.com.vn",
    }
    resp = requests.get(SSI_URL, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    ctype = resp.headers.get("Content-Type", "")
    if "json" not in ctype and not resp.text.lstrip().startswith("{"):
        raise ValueError("SSI trả về HTML thay vì JSON")
    return _parse_history(resp.json())


def fetch_ohlcv(
    symbol: str = SYMBOL,
    start: str = START_DATE,
    end: Optional[str] = END_DATE,
    use_cache: bool = True,
) -> pd.DataFrame:
    """
    Tải dữ liệu ngày của hợp đồng phái sinh.
    Ưu tiên VNDIRECT, fallback SSI. Có cache JSON local.
    """
    DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    end_label = end or date.today().isoformat()
    cache_path = DATA_CACHE_DIR / f"{symbol}_{start}_{end_label}.json"

    if use_cache and cache_path.exists():
        raw = json.loads(cache_path.read_text(encoding="utf-8"))
        df = pd.DataFrame(raw)
        df["date"] = pd.to_datetime(df["date"])
        return df.set_index("date").sort_index()

    errors: list[str] = []
    df = pd.DataFrame()
    for name, loader in (("VNDIRECT", _fetch_vndirect), ("SSI", _fetch_ssi)):
        try:
            df = loader(symbol, start, end)
            if not df.empty:
                print(f"[data] Đã tải {len(df)} phiên {symbol} từ {name}")
                break
            errors.append(f"{name}: rỗng")
        except Exception as exc:  # noqa: BLE001 - muốn thử nguồn tiếp theo
            errors.append(f"{name}: {exc}")

    if df.empty:
        raise RuntimeError("Không tải được dữ liệu. Chi tiết: " + "; ".join(errors))

    export = df.reset_index()
    export["date"] = export["date"].dt.strftime("%Y-%m-%d")
    cache_path.write_text(
        export.to_json(orient="records", force_ascii=False, indent=2),
        encoding="utf-8",
    )
    return df


if __name__ == "__main__":
    data = fetch_ohlcv(use_cache=False)
    print(data.tail())
    print(f"Số phiên: {len(data)} | Close cuối: {data['close'].iloc[-1]:.1f}")
