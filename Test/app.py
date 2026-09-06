"""
Web UI backtest phái sinh VN30 — chọn chiến lược bằng dropdown.
"""

from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from config import OUTPUT_DIR
from runner import run_strategy_backtest
from strategy.registry import list_strategies

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/output/<path:filename>")
def output_files(filename: str):
    return send_from_directory(OUTPUT_DIR, filename)


@app.get("/api/strategies")
def api_strategies():
    return jsonify({"strategies": list_strategies()})


@app.get("/api/backtest/<strategy_id>")
def api_backtest(strategy_id: str):
    try:
        payload = run_strategy_backtest(strategy_id)
        return jsonify(payload)
    except KeyError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    app.run(host="127.0.0.1", port=5000, debug=True)
