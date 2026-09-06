"""Cấu hình hệ thống backtest phái sinh Việt Nam."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
DATA_CACHE_DIR = BASE_DIR / "data" / "cache"

# Mã hợp đồng phái sinh gần nhất (continuous front-month trên chart broker)
SYMBOL = "VN30F1M"

# Khoảng thời gian lấy dữ liệu (YYYY-MM-DD)
START_DATE = "2024-01-01"
END_DATE = None  # None = đến hôm nay

# Thông số hợp đồng VN30 Futures (theo quy định HNX)
MULTIPLIER = 100_000  # VND / điểm chỉ số
INITIAL_MARGIN_PER_CONTRACT = 18_000_000  # ước lượng ký quỹ ban đầu / hợp đồng
FEE_PER_SIDE = 25_000  # phí + thuế ước lượng mỗi lần mở/đóng 1 HĐ (VND)

# Vốn ban đầu
INITIAL_CAPITAL = 200_000_000  # 200 triệu VND
MAX_CONTRACTS = 2

# Tham số chiến lược SMA crossover
FAST_MA = 10
SLOW_MA = 30

# Tham số chiến lược RSI (TA-Lib)
RSI_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
