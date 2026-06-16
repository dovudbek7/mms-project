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

    # --- 金額/規程デフォルト (旅費規定 未提供 → プレースホルダ) ---
    # 空 dict / None は「規程未提供」のセンチネル. 実値を入れると判定が有効化される.
    amount_limits: dict = field(default_factory=dict)
    # 例 (規程入手後に設定): {"日当": {"0": 0, "50": 1000, "100": 2000}, "宿泊料上限": 10000}
    receipt_required_above: int | None = None     # None → 領収書閾値は規程未提供
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
        "旅費規定(J-4-1 / 判定ルールマスタ)が未提供 — 金額・領収書の上限判定は config 既定値依存。実値が無い限り NG は出さず『未確認(規程未提供)』。",
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
