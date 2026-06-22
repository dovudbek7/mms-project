"""金額規程チェック (§6.3 amount-rule check).

出張精算レポート (ExpenseReport) に対し, 金額面の妥当性を2系統で判定する.

(1) データ整合性 (data-integrity, 常時実行・規程不要):
    - 合計(申告) と 明細金額合計(計算) の一致
    - 行数(宣言) と 実明細数の一致
    - 各明細の 金額>=0 かつ 小計==金額
    これらは社内データの内部整合であり, 旅費規定の有無に依らず判定できる.

(2) 規程ベース上限判定 (rule-based, 旅費規定 必須):
    - 距離区分(到着地 km 下限バンド) と 手当CD から日当・宿泊料の上限を引き
      明細金額と突合する (超過->NG, 範囲内->OK).
    - 旅費規定(cfg.amount_limits)が未提供の場合は判定不能のため
      RULE_MISSING('未確認(規程未提供)') を返し, NG は出さない.

総合判定は worst_status([整合性ステータス, 規程ステータス]) で決まる.
整合性がクリーンでも規程が無ければ上限未検証のため OK ではなく RULE_MISSING になる.
"""
from __future__ import annotations

from models import (
    ExpenseReport,
    ExpenseLeg,
    CheckResult,
    OK,
    NG,
    NEEDS_CHECK,
    RULE_MISSING,
    worst_status,
)
from config import Config


def _check_integrity(r: ExpenseReport) -> tuple[str, list[str], dict]:
    """データ整合性のみを判定し (ステータス, 理由群, evidence) を返す.

    旅費規定に依存しない内部整合チェック. 戻り値の理由群は detail へ連結する.
    """
    reasons: list[str] = []
    evidence: dict = {}
    statuses: list[str] = []

    # --- 合計と明細金額合計の関係 ---
    # 重要: 合計(申告) = 明細金額合計(小計の和) + 手当(日当/宿泊料/滞在費補助)。
    # 手当は金額/小計の列に現れず, 旅費規定で金額化されるため,
    #   合計 != 明細合計 は「正常」(差額=手当相当) であり NG ではない。
    # NG になるのは 明細合計 > 合計 (明細が申告総額を超過=真の誤り) のときのみ。
    gap = r.total_amount - r.computed_total  # 正常時は手当相当 (>=0)
    has_allowance = any(
        (leg.allowance_cd_perdiem or leg.allowance_cd_lodging or leg.allowance_cd_stay)
        for leg in r.legs
    )
    if r.computed_total > r.total_amount:
        # 明細金額の合計が申告合計を上回る -> 真の不整合
        statuses.append(NG)
        reasons.append(
            f"明細金額合計が申告合計を超過: 計算{r.computed_total} > 申告{r.total_amount}"
        )
        evidence["合計超過"] = {
            "申告合計": r.total_amount,
            "計算合計": r.computed_total,
            "超過額": -gap,
        }
    elif gap > 0 and not has_allowance:
        # 差額があるのに手当コードが無い -> 説明不能の差額 -> 要確認
        statuses.append(NEEDS_CHECK)
        reasons.append(
            f"申告合計と明細合計に差額{gap}があるが手当コードなし: 要確認"
        )
        evidence["差額要確認"] = {
            "申告合計": r.total_amount,
            "計算合計": r.computed_total,
            "差額": gap,
        }
    elif gap > 0:
        # 差額=手当相当 (正常). 手当額自体は規程未提供のため未検証 (規程パートで扱う)
        evidence["手当相当差額"] = {
            "申告合計": r.total_amount,
            "明細金額合計": r.computed_total,
            "手当相当差額": gap,
        }

    # --- 行数不一致: 宣言行数 != 実明細数 -> 要確認 ---
    if r.actual_leg_count != r.declared_leg_count:
        statuses.append(NEEDS_CHECK)
        reasons.append(
            f"行数不一致: 宣言{r.declared_leg_count} != 実{r.actual_leg_count}"
        )
        evidence["行数不一致"] = {
            "宣言行数": r.declared_leg_count,
            "実明細数": r.actual_leg_count,
        }

    # --- 明細の金額異常: 金額<0 または 小計!=金額 -> NG ---
    bad_legs: list[dict] = []
    for leg in r.legs:
        if leg.amount < 0 or leg.subtotal != leg.amount:
            bad_legs.append(
                {
                    "明細No": leg.leg_no,
                    "金額": leg.amount,
                    "小計": leg.subtotal,
                }
            )
    if bad_legs:
        statuses.append(NG)
        reasons.append(
            f"明細金額異常 ({len(bad_legs)}件): 金額<0 または 小計!=金額"
        )
        evidence["明細金額異常"] = bad_legs

    return worst_status(statuses), reasons, evidence


def _limit_for(limits: dict, key: str, km_lower: int | None):
    """距離区分(km 下限バンド)に対応する上限値を cfg.amount_limits から引く.

    limits[key] は {km下限(str): 上限額} のマップ想定 (例 {"0":0,"50":1000}).
    対象 km_lower 以下で最大の下限キーの値を採用する (バンド下限一致/直近下位).
    キー欠落・未知バンドは None を返し, 呼び出し側で判定不能として扱う.
    """
    table = limits.get(key)
    if not isinstance(table, dict) or km_lower is None or km_lower < 0:
        return None
    best_key = None
    best_lower = -1
    for k in table:
        try:
            lo = int(k)
        except (TypeError, ValueError):
            continue
        if lo <= km_lower and lo > best_lower:
            best_lower = lo
            best_key = k
    if best_key is None:
        return None
    return table[best_key]


def _check_rules(r: ExpenseReport, cfg: Config) -> tuple[str, list[str], dict]:
    """旅費規定ベースの上限判定を行い (ステータス, 理由群, evidence) を返す.

    cfg.has_amount_rules() が偽なら判定不能 -> RULE_MISSING.
    真なら各明細の 手当CD と 距離区分 から上限を引き, 金額と突合する.
    """
    if not cfg.has_amount_rules():
        return (
            RULE_MISSING,
            ["旅費規定 未提供のため金額上限判定不可"],
            {"規程": "未提供"},
        )

    limits = cfg.amount_limits
    reasons: list[str] = []
    evidence: dict = {}
    statuses: list[str] = []
    overs: list[dict] = []
    unresolved: list[dict] = []   # 手当ありだが距離区分不明で上限を引けないレッグ

    for leg in r.legs:
        # 日当 (手当1CD) — 距離区分バンドごとの上限
        if leg.allowance_cd_perdiem:
            cap = _limit_for(limits, "日当", leg.dest_km_lower)
            if cap is None:
                unresolved.append(
                    {"明細No": leg.leg_no, "種別": "日当", "金額": leg.amount,
                     "km下限": leg.dest_km_lower, "理由": "距離区分未確定で上限を引けない"}
                )
            elif leg.amount > cap:
                overs.append(
                    {"明細No": leg.leg_no, "種別": "日当", "金額": leg.amount,
                     "上限": cap, "km下限": leg.dest_km_lower}
                )
        # 宿泊料 (手当2CD) — 上限額 (距離区分非依存の単一上限を想定)
        if leg.allowance_cd_lodging:
            cap = limits.get("宿泊料上限")
            if cap is None:
                unresolved.append(
                    {"明細No": leg.leg_no, "種別": "宿泊料", "金額": leg.amount,
                     "理由": "宿泊料上限が規程に未定義"}
                )
            elif leg.amount > cap:
                overs.append(
                    {"明細No": leg.leg_no, "種別": "宿泊料", "金額": leg.amount, "上限": cap}
                )

    if overs:
        statuses.append(NG)
        reasons.append(f"金額上限超過 ({len(overs)}件)")
        evidence["金額上限超過"] = overs
    if unresolved:
        # 上限を引けないレッグは『超過なし』とみなさず未検証として要確認
        statuses.append(NEEDS_CHECK)
        reasons.append(f"上限未検証 ({len(unresolved)}件): 距離区分/規程未確定")
        evidence["上限未検証"] = unresolved
    if not overs and not unresolved:
        # 規程あり・全レッグ上限確認済 -> OK
        statuses.append(OK)

    return worst_status(statuses), reasons, evidence


def check_amount(r: ExpenseReport, cfg: Config) -> CheckResult:
    """金額規程チェック (§6.3). データ整合性 + 規程上限判定の総合.

    総合ステータスは worst_status([整合性, 規程]). NG/要確認 時は差戻し文面候補
    (suggestion) を付す. 規程未提供時は RULE_MISSING を返し NG は出さない.
    """
    integ_status, integ_reasons, integ_ev = _check_integrity(r)
    rule_status, rule_reasons, rule_ev = _check_rules(r, cfg)

    overall = worst_status([integ_status, rule_status])

    # detail: 整合性・規程の理由を連結 (空なら正常文言)
    reasons = integ_reasons + rule_reasons
    detail = " / ".join(reasons) if reasons else "金額整合性: 問題なし"

    evidence: dict = {}
    evidence.update(integ_ev)
    evidence.update(rule_ev)
    evidence["整合性判定"] = integ_status
    evidence["規程判定"] = rule_status

    # suggestion: NG / 要確認 のときのみ差戻し文面候補を生成
    suggestion = ""
    if overall in (NG, NEEDS_CHECK):
        parts: list[str] = []
        if "合計超過" in integ_ev:
            parts.append("明細金額の合計が申告合計を超過しています。金額を確認・修正してください")
        if "差額要確認" in integ_ev:
            parts.append("申告合計と明細合計の差額(手当コードなし)の内訳を確認してください")
        if "行数不一致" in integ_ev:
            parts.append("行数(宣言)と明細件数の差異を確認してください")
        if "明細金額異常" in integ_ev:
            parts.append("金額がマイナス/小計不一致の明細を是正してください")
        if "金額上限超過" in rule_ev:
            parts.append("旅費規定の上限を超過した明細の妥当性を確認してください")
        suggestion = "。".join(parts) + "。" if parts else ""

    return CheckResult(
        status=overall,
        detail=detail,
        evidence=evidence,
        suggestion=suggestion,
    )
