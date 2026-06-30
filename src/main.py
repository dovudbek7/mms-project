"""エントリポイント: 全データ読込 -> enrich -> 6観点判定 -> 7シートExcel出力.

実行: python3 src/main.py            (既定 config)
      python3 src/main.py --config conf.json
出力: out/出張精算_承認チェックシート_YYYYMMDD_HHMMSS.xlsx
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

# src/ を import パスに追加 (フラット import 規約)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import load_config, Config
from loaders.expense_loader import load_expense_reports
from loaders.attendance_loader import load_attendance
from loaders.employee_loader import load_employees
from loaders.customer_loader import load_customers
from loaders.approver_loader import load_approver_rules
from checksheet import build_check_sheet
from excel_writer import write_excel
from html_writer_web import read_excel_and_write_html


def run(cfg: Config, stamp: str | None = None) -> str:
    import os as _os

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    import_log: list[dict] = []

    def _step(no, label, fn, path):
        """ローダを実行し取込ログ行を記録. 失敗は例外行を残して再送出."""
        print(f"[{no}/5] {label} 読込 ...", flush=True)
        try:
            data = fn()
            n = len(data)
            print(f"      -> {n} 件")
            import_log.append({
                "区分": label, "ファイル名": _os.path.basename(str(path)),
                "件数": n, "詳細": f"取込日時 {now}", "結果": "OK",
            })
            return data
        except Exception as e:  # noqa: BLE001
            import_log.append({
                "区分": label, "ファイル名": _os.path.basename(str(path)),
                "件数": 0, "詳細": f"{type(e).__name__}: {e}", "結果": "エラー",
            })
            raise

    reports = _step(1, "出張精算CSV", lambda: load_expense_reports(cfg.expense_csv_path, cfg), cfg.expense_csv_path)
    attendance = _step(2, "勤怠(出勤簿)", lambda: load_attendance(cfg.attendance_paths),
                       " / ".join(_os.path.basename(p) for p in cfg.attendance_paths))
    employees = _step(3, "社員マスタ", lambda: load_employees(cfg.employee_master_path, cfg.master_password), cfg.employee_master_path)
    customers = _step(4, "顧客マスタ", lambda: load_customers(cfg.customer_master_path, cfg.master_password), cfg.customer_master_path)
    approvers = _step(5, "承認者名簿", lambda: load_approver_rules(cfg.approver_roster_path, cfg.approver_roster_sheet), cfg.approver_roster_path)

    print("[*] enrich + 判定 + 出力生成 ...", flush=True)
    sheet = build_check_sheet(reports, employees, customers, approvers, attendance, cfg,
                              import_log=import_log)

    stamp = stamp or datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = os.path.join(cfg.output_dir, stamp)
    os.makedirs(out_dir, exist_ok=True)

    base_name = f"{cfg.output_prefix}_{stamp}"
    out_path  = os.path.join(out_dir, f"{base_name}.xlsx")
    html_ja   = os.path.join(out_dir, f"{base_name}_ja.html")
    html_uz   = os.path.join(out_dir, f"{base_name}_uz.html")

    write_excel(sheet, out_path, cfg)
    read_excel_and_write_html(out_path, html_ja, lang="ja")
    read_excel_and_write_html(out_path, html_uz, lang="uz")

    # サマリ統計
    overall = [r["総合判定"] for r in sheet["primary"]]
    from collections import Counter
    print("\n=== 総合判定 内訳 ===")
    for k, v in Counter(overall).most_common():
        print(f"  {k}: {v}")
    print(f"\n出力フォルダ: {out_dir}")
    return out_path


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="出張精算 承認チェックシート生成")
    ap.add_argument("--config", default=None, help="JSON設定ファイル(任意)")
    ap.add_argument("--stamp", default=None, help="出力ファイル名のタイムスタンプ上書き")
    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    try:
        run(cfg, args.stamp)
        return 0
    except Exception as e:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        print(f"\n[ERROR] {type(e).__name__}: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
