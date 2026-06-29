"""設定 (paths, password, thresholds, 規程デフォルト).

旅費規定ファイルが未提供のため, 金額系の閾値はすべて config 駆動の
プレースホルダ. 実値が無い限り判定は NG ではなく 未確認(規程未提供) を出す.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

# プロジェクトルート (このファイルの2つ上)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "出張精算データ一式")
RAKU = os.path.join(DATA, "楽々精算・楽々勤怠データ")
LIST = os.path.join(DATA, "顧客・社員リスト")


@dataclass
class Config:
    # --- 入力パス ---
    expense_csv_path: str = os.path.join(RAKU, "出張精算_20260602_085224.csv")
    employee_master_path: str = os.path.join(LIST, "社員リスト_20260608.xlsx")
    customer_master_path: str = os.path.join(LIST, "顧客リスト_20260608.xlsx")
    approver_roster_path: str = os.path.join(DATA, "20期評価者・承認者一覧_20260401.xlsx")
    attendance_paths: list = field(default_factory=lambda: [
        os.path.join(RAKU, "出勤簿_日別詳細_20260528160105.xlsx"),
        os.path.join(RAKU, "出勤簿_日別詳細_20260605120823.xlsx"),
    ])
    approver_roster_sheet: str = "20期"

    # --- 出力 ---
    output_dir: str = os.path.join(ROOT, "out")
    output_prefix: str = "出張精算_承認チェックシート"

    # --- 読込パラメータ ---
    master_password: str = "peeg0608"
    csv_encoding: str = "cp932"

    # --- 照合閾値 ---
    place_match_threshold: int = 82          # rapidfuzz partial_ratio (0-100)
    fuzzy_name_threshold: float = 0.85        # difflib ratio (0-1)
    allow_adjacent_month_attendance: bool = False  # 隣接月勤怠での暫定照合

    # --- 労務閾値 ---
    late_night_start_before: int = 5          # 時刻 < 05:00 を深夜発とみなす
    late_night_end_after: int = 22            # 時刻 > 22:00 を深夜着とみなす

    # --- 金額/規程 (J-4-1 国内出張旅費規定 2025-10-01施行 より) ---
    amount_limits: dict = field(default_factory=lambda: {
        # 手当1CD (日当)
        "出張日当": {"一般職": 1700, "管理職": 3000},
        # 手当3CD (滞在費補助)
        "滞在補助費": {"一般職": 3500, "管理職": 5000},
        # account_name で識別: 出張加算日当
        "出張加算日当": {"一般職": 800, "主任以上": 1100},
        # account_name で識別: 長距離運転手当 (range check)
        "長距離運転手当": {
            "日帰り_下限": 2500, "日帰り_上限": 3500,
            "宿泊時_下限": 1500, "宿泊時_上限": 2500,
            "長距離加算_km": 300, "長距離加算額": 1000,
        },
        # 手当2CD (宿泊料) — 地域×役職
        "ホテル代": {
            "東京23区": {"管理職": 15000, "一般職": 13500},
            "その他":   {"管理職": 11000, "一般職": 9500},
        },
    })
    receipt_required_above: int | None = 1000    # 1,000円以上の非免除明細は領収書必須
    receipt_exempt_transports: tuple = ("電車･ﾊﾞｽ",)  # IC/運賃系は領収書免除候補
    # 規程未提供時のフォールバック (旅費規定 入手後は receipt_required_above が優先):
    #   - high_value_provisional: 免除交通機関でもこの額以上・領収書なしは要確認
    #     (例: 新幹線相当の高額交通費の見逃し防止)
    #   - min_amount_to_flag: 非免除でもこの額未満は要確認にしない
    #     (宿泊税/駐車代等の少額付随費による過剰検知を抑制)
    receipt_high_value_provisional: int = 10000
    receipt_min_amount_to_flag: int = 1000
    confirm_only_counts_as_approval: bool = False

    # --- 名前エイリアス (カタカナ/漢字ゆれの手動辞書) ---
    name_aliases: dict = field(default_factory=lambda: {"張学シン": "張学鑫"})

    # --- 地名エイリアス (カタカナ↔ラテン社名ゆれ; 誤突合防止) ---
    # 例: CSV 'シムテック' は顧客マスタ 'SIMMTECH GRAPHICS' のカタカナ表記.
    # 部分文字列置換で適用するため 'シムテック中大塩' も SIMMTECH へ寄せられる.
    place_aliases: dict = field(default_factory=lambda: {
        "シムテック": "SIMMTECH GRAPHICS",
    })

    # --- 既知の欠落 (常に出力にバナー表示) ---
    known_gaps: list = field(default_factory=lambda: [
        "2026-05 の出勤簿(勤怠)が未提供 — 出張実態・労務の勤怠照合は劣化(advisory)。",
        "社員マスタに役職列(役職/グレード/職位)が未登録の場合、役職不明として一般職上限と管理職上限の間は要確認扱いになります。",
    ])

    def has_amount_rules(self) -> bool:
        """金額規程の実値が設定されているか."""
        return bool(self.amount_limits)

    def has_receipt_rule(self) -> bool:
        return self.receipt_required_above is not None


def load_config(path: str | None = None) -> Config:
    """設定をロード. path 指定時は JSON で上書き (将来拡張用)."""
    cfg = Config()
    if path and os.path.exists(path):
        import json
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for k, v in data.items():
            if hasattr(cfg, k):
                setattr(cfg, k, v)
    return cfg
