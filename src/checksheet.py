"""チェックシート組立 (enrich + 6 判定 → spec §6 の 7 シート分の行 dict).

入力モデル群を受け取り, 従業員/地名照合で enrich し, 6 観点を判定し,
excel_writer.write_excel が期待する dict を返す.

出力 dict キー → spec §6 シート:
  primary       → 01_一次承認チェック (申請(伝票)1件1行: 総合判定/要確認項目/差戻し候補)
  secondary     → 02_二次承認詳細     (明細(レッグ)単位: 金額/領収書/宿泊/日当/日程/距離)
  diff          → 03_差異一覧         (OK以外の観点のみ: 理由/確認先システム/対応案)
  reject        → 04_差戻し文面候補   (要確認/NG の観点ごとに差戻し文面)
  import_log    → 05_取込ログ         (取込件数/未承認件数照合/エラー)
  rules         → 06_判定ルール       (使用閾値/区分/規程提供状況)
  master_check  → 07_マスタ確認       (未登録/重複/不整合)
  banners       → 既知の前提・データ欠落バナー
"""
from __future__ import annotations

from collections import Counter
from datetime import date

from models import (
    ExpenseReport, AttendanceLookup,
    MOVEMENT_TRANSPORTS,
    OK, NEEDS_CHECK, NG, UNMATCHED, MULTI, RULE_MISSING, ATT_MISSING,
    worst_status, to_axis_vocab,
)
from matching.employee_match import build_employee_index, resolve_employee
from matching.place_match import build_customer_index, match_place
from matching.approver_match import build_approver_index
from normalize import norm
from rules.trip_reality import check_trip_reality
from rules.labor import check_labor
from rules.amount import check_amount
from rules.duplicate import check_duplicate
from rules.receipt import check_receipt
from rules.approval_route import check_approval_route


def _d(d: date | None) -> str:
    return d.isoformat() if d else ""


# 観点 → 確認先システム (§6.1 「確認先システムと確認観点を表示」)
_AXIS_SYSTEM = {
    "出張実態": "楽々勤怠 (勤務実績)",
    "労務": "楽々勤怠 (勤務時刻/休日)",
    "金額規程": "楽々精算 + 旅費規定",
    "二重申請": "楽々精算 (他申請)",
    "領収書": "楽々精算 (添付/証票)",
    "承認ルート": "20期承認者名簿 + 楽々精算",
}


def enrich_reports(reports, employees, customers, cfg) -> None:
    """各レポートに従業員ID, 各レッグに照合顧客/距離を付与 (in place)."""
    eidx = build_employee_index(employees)
    cidx = build_customer_index(customers)
    emp_by_id = {e.employee_id: e for e in employees}
    for r in reports:
        res = resolve_employee(r.inputter_name_raw, eidx, cfg)
        r.employee_id = res.employee_id
        r.employee_match_status = res.status
        if res.employee_id and res.employee_id in emp_by_id:
            e = emp_by_id[res.employee_id]
            r.department = e.department
            r.email = e.email
            r.resolved_name_norm = e.name_norm
        for leg in r.legs:
            # 移動レッグ(電車･ﾊﾞｽ/車等)の到着地は経由地であり訪問先(顧客)ではない.
            # 地名→無関係社名の誤突合を避けるため顧客照合をスキップする.
            if leg.is_movement_leg or leg.transport in MOVEMENT_TRANSPORTS:
                leg.dest_match_status = UNMATCHED
                continue
            target = leg.dest_raw or leg.origin_raw
            pm = match_place(target, cidx, cfg)
            leg.dest_customer_no = pm.customer_no
            leg.dest_customer_name = pm.customer_name
            leg.dest_match_score = pm.score
            leg.dest_match_status = pm.status
            leg.dest_distance_band = pm.distance_band
            leg.dest_km_lower = pm.km_lower
            leg.dest_km_upper = pm.km_upper
            leg.dest_candidates = pm.candidates
    return eidx, cidx


def _allowance_flags(r: ExpenseReport) -> tuple[bool, bool, bool]:
    """伝票内に 日当/宿泊/滞在 手当コードを持つレッグがあるか."""
    per = any(leg.allowance_cd_perdiem for leg in r.legs)
    lodge = any(leg.allowance_cd_lodging for leg in r.legs)
    stay = any(leg.allowance_cd_stay for leg in r.legs)
    return per, lodge, stay


def _matched_bands(r: ExpenseReport) -> str:
    """突合できた訪問先レッグの距離区分一覧 (カンマ連結)."""
    bands = []
    for leg in r.legs:
        if leg.dest_match_status in ("突合", "別名突合") and leg.dest_distance_band:
            if leg.dest_distance_band not in bands:
                bands.append(leg.dest_distance_band)
    return ", ".join(bands)


def build_check_sheet(reports, employees, customers, approver_rules,
                      attendance_days, cfg, import_log=None) -> dict:
    eidx, cidx = enrich_reports(reports, employees, customers, cfg)
    aidx = build_approver_index(approver_rules)
    att = AttendanceLookup(attendance_days)

    dup_results = check_duplicate(reports, cfg)        # voucher -> CheckResult

    primary_rows, secondary_rows = [], []
    diff_rows, reject_rows = [], []

    for r in reports:
        cr_trip = check_trip_reality(r, att, cfg)
        cr_labor = check_labor(r, att, cfg)
        cr_amt = check_amount(r, cfg)
        cr_dup = dup_results.get(r.voucher_no)
        cr_rcpt = check_receipt(r, cfg)
        cr_appr = check_approval_route(r, aidx, eidx, cfg)

        # 観点ごとの (raw CheckResult, spec語彙ステータス)
        axes = [
            ("出張実態", cr_trip),
            ("労務", cr_labor),
            ("金額規程", cr_amt),
            ("二重申請", cr_dup),
            ("領収書", cr_rcpt),
            ("承認ルート", cr_appr),
        ]
        spec_status = {ax: to_axis_vocab(ax, (cr.status if cr else OK)) for ax, cr in axes}
        overall = worst_status(list(spec_status.values()))

        # 要確認項目 (OK 以外の観点名)
        flagged_axes = [ax for ax, _ in axes if spec_status[ax] != OK]
        # 差戻し候補 (OK 以外の観点の suggestion を連結; 全観点分を漏らさない)
        suggestions = []
        for ax, cr in axes:
            if cr and spec_status[ax] != OK and cr.suggestion:
                suggestions.append(cr.suggestion)

        period = f"{_d(r.date_min)}〜{_d(r.date_max)}"

        # --- 01_一次承認チェック ---
        primary_rows.append({
            "伝票No.": r.voucher_no,
            "入力者名": r.inputter_name_raw,
            "社員番号": r.employee_id or "(未突合)",
            "所属": r.department or "",
            "出張期間": period,
            "合計金額": r.total_amount,
            "承認状態": r.approval_status,
            "出張実態": spec_status["出張実態"],
            "労務": spec_status["労務"],
            "金額規程": spec_status["金額規程"],
            "二重申請": spec_status["二重申請"],
            "領収書": spec_status["領収書"],
            "承認ルート": spec_status["承認ルート"],
            "総合判定": overall,
            "要確認項目": "・".join(flagged_axes) if flagged_axes else "",
            "差戻し候補": " / ".join(suggestions),
        })

        # --- 03_差異一覧 (OK以外の観点) ---
        for ax, cr in axes:
            if cr and spec_status[ax] != OK:
                diff_rows.append({
                    "伝票No.": r.voucher_no,
                    "入力者名": r.inputter_name_raw,
                    "観点": ax,
                    "判定": spec_status[ax],
                    "判定理由": cr.detail,
                    "確認先システム": _AXIS_SYSTEM.get(ax, ""),
                    "対応案": cr.suggestion,
                })

        # --- 04_差戻し文面候補 (要確認/NG/未突合 かつ suggestion あり) ---
        for ax, cr in axes:
            if cr and spec_status[ax] in (NEEDS_CHECK, NG, UNMATCHED) and cr.suggestion:
                reject_rows.append({
                    "伝票No.": r.voucher_no,
                    "入力者名": r.inputter_name_raw,
                    "宛先(メール)": r.email or "(未登録)",
                    "理由区分": ax,
                    "判定": spec_status[ax],
                    "差戻し文面候補": cr.suggestion,
                })

        # --- 02_二次承認詳細 (明細レッグ単位) ---
        per, lodge, stay = _allowance_flags(r)
        for leg in r.legs:
            cand = ""
            if leg.dest_candidates:
                cand = " / ".join(f"{n}({b})" for n, b in leg.dest_candidates)
            secondary_rows.append({
                "伝票No.": r.voucher_no,
                "入力者名": r.inputter_name_raw,
                "明細No.": leg.leg_no,
                "明細日付": _d(leg.leg_date),
                "開始": leg.time_start.strftime("%H:%M") if leg.time_start else "",
                "終了": leg.time_end.strftime("%H:%M") if leg.time_end else "",
                "出発地": leg.origin_raw or "",
                "到着地": leg.dest_raw or "",
                "交通機関": leg.transport,
                "金額": leg.amount,
                "証票": leg.receipt_label,
                "日当CD": leg.allowance_cd_perdiem or "",
                "宿泊CD": leg.allowance_cd_lodging or "",
                "滞在CD": leg.allowance_cd_stay or "",
                "勘定科目名": leg.account_name,
                "照合顧客名": leg.dest_customer_name or "",
                "距離区分": leg.dest_distance_band or "",
                "照合状態": leg.dest_match_status,
                "複数候補": cand,
            })

    # --- 07_マスタ確認 ---
    master_rows = _build_master_check(reports, employees, approver_rules, aidx)

    # --- 05_取込ログ (取込明細 + 件数照合) ---
    pending = sum(1 for r in reports if not r.is_approved)
    log_rows = list(import_log or [])
    log_rows.append({
        "区分": "件数照合", "ファイル名": "(集計)",
        "件数": len(reports),
        "詳細": f"対象件数(伝票)={len(reports)} / 未承認件数={pending} / 承認済={len(reports)-pending}",
        "結果": "OK",
    })

    # --- 06_判定ルール ---
    rule_rows = _build_rule_rows(cfg)

    # --- 既知欠落バナー ---
    banners = list(cfg.known_gaps)
    if attendance_days:
        months = sorted({(d.work_date.year, d.work_date.month)
                         for d in attendance_days if d.work_date})
        banners.append("勤怠データ対象月: " + ", ".join(f"{y}-{m:02d}" for y, m in months))

    return {
        "primary": primary_rows,
        "secondary": secondary_rows,
        "diff": diff_rows,
        "reject": reject_rows,
        "import_log": log_rows,
        "rules": rule_rows,
        "master_check": master_rows,
        "banners": banners,
    }


def _build_master_check(reports, employees, approver_rules, aidx) -> list[dict]:
    """マスタ品質問題 (未登録/重複/不整合) を 07_マスタ確認 行に整形."""
    rows: list[dict] = []
    emp_names = {e.name_norm for e in employees if e.name_norm}
    roster_names = {norm(r.employee_name_norm or r.employee_name_raw)
                    for r in approver_rules}
    roster_names.discard("")

    # (a) 申請者が従業員マスタ/20期名簿に未登録
    seen_applicant = set()
    for r in reports:
        key = r.inputter_name_norm
        if key in seen_applicant:
            continue
        seen_applicant.add(key)
        rkey = r.resolved_name_norm or key
        if r.employee_match_status == "未突合":
            rows.append({
                "種別": "社員マスタ未突合", "対象": r.inputter_name_raw,
                "詳細": "入力者名が社員マスタと突合できない", "対応": "氏名表記を社員マスタと突合・修正",
            })
        elif aidx.get(rkey) is None and aidx.get(key) is None:
            rows.append({
                "種別": "承認者名簿 未登録", "対象": r.inputter_name_raw,
                "詳細": "申請者が20期承認者名簿に未登録 (出張命令者を判定不可)",
                "対応": "20期名簿に申請者を登録",
            })

    # (b) 名簿にあるが社員マスタに無い氏名 (不整合)
    for nm in sorted(roster_names - emp_names):
        rows.append({
            "種別": "名簿/マスタ不整合", "対象": nm,
            "詳細": "20期名簿に存在するが社員マスタに無い氏名",
            "対応": "社員マスタ/名簿の氏名表記を突合・統一",
        })

    # (c) 社員マスタ内の氏名重複
    name_counts = Counter(e.name_norm for e in employees if e.name_norm)
    for nm, cnt in name_counts.items():
        if cnt > 1:
            rows.append({
                "種別": "社員マスタ重複", "対象": nm,
                "詳細": f"同一氏名が {cnt} 件 (氏名のみでは一意化不可)",
                "対応": "社員番号で区別 / 重複登録を確認",
            })

    return rows


def _build_rule_rows(cfg) -> list[dict]:
    """06_判定ルール: 使用した閾値・区分・規程提供状況を行に整形."""
    rows = [
        {"項目": "氏名ファジー閾値", "値": cfg.fuzzy_name_threshold, "備考": "difflib ratio (社員突合)"},
        {"項目": "地名照合閾値", "値": cfg.place_match_threshold, "備考": "rapidfuzz partial_ratio (顧客突合)"},
        {"項目": "深夜発 閾値", "値": f"< {cfg.late_night_start_before:02d}:00", "備考": "移動開始がこれ以前"},
        {"項目": "深夜着 閾値", "値": f"> {cfg.late_night_end_after:02d}:00", "備考": "移動終了がこれ以降"},
        {"項目": "領収書 高額暫定閾値", "値": cfg.receipt_high_value_provisional, "備考": "規程未提供時の高額判定"},
        {"項目": "領収書 検知下限", "値": cfg.receipt_min_amount_to_flag, "備考": "これ未満の少額は要確認にしない"},
        {"項目": "金額規程(上限)提供", "値": "あり" if cfg.has_amount_rules() else "未提供",
         "備考": "未提供時は金額上限を要確認(NGは出さない)"},
        {"項目": "領収書要否規程提供", "値": "あり" if cfg.has_receipt_rule() else "未提供",
         "備考": "未提供時は暫定閾値で判定"},
        {"項目": "確認のみ=承認 扱い", "値": "する" if cfg.confirm_only_counts_as_approval else "しない",
         "備考": "(確認)承認者を正式承認と見なすか"},
    ]
    for g in cfg.known_gaps:
        rows.append({"項目": "既知の前提/欠落", "値": "", "備考": g})
    return rows
