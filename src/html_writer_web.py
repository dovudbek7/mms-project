"""Excel チェックシート → 自己完結 HTML ビューワー生成.

使い方:
    from html_writer_web import write_html
    write_html(sheet_data, out_path)

sheet_data は excel_writer.py が受け取る同じ辞書構造を想定しているが、
既存の Excel ファイルからも読み込める (read_excel_to_html を参照)。
"""
from __future__ import annotations

import json
import os
from datetime import datetime


# ── ステータスラベル → CSS クラス ──────────────────────────────────────────
def _status_class(val: str) -> str:
    v = str(val).strip()
    if v == "NG":
        return "s-ng"
    if v in ("要確認", "要確認(勤怠データ欠落)"):
        return "s-warn"
    if v == "OK":
        return "s-ok"
    if v.startswith("未確認"):
        return "s-unknown"
    return ""


STATUS_COLS_01 = {7, 8, 9, 10, 11, 12, 13}   # 0-based indices in sheet 01 data rows


def _cell_html(val: str, col_idx: int, sheet_id: str) -> str:
    cls = ""
    if sheet_id == "01" and col_idx in STATUS_COLS_01:
        cls = _status_class(val)
    elif sheet_id == "03" and col_idx == 3:
        cls = _status_class(val)
    elif sheet_id == "04" and col_idx == 4:
        cls = _status_class(val)
    elif sheet_id == "05" and col_idx == 4:
        cls = "s-ok" if val == "OK" else "s-ng"
    if cls:
        return f'<span class="badge {cls}">{val}</span>'
    return val


def _build_table(header: list[str], rows: list[list[str]], sheet_id: str) -> str:
    th_html = "".join(
        f'<th onclick="sortTable(this)" data-col="{i}">'
        f'{h}<span class="sort-icon">⇅</span></th>'
        for i, h in enumerate(header)
    )
    tr_html_parts = []
    for row in rows:
        tds = "".join(
            f'<td title="{str(row[i]) if i < len(row) else ""}">'
            f'{_cell_html(str(row[i]) if i < len(row) else "", i, sheet_id)}</td>'
            for i in range(len(header))
        )
        tr_html_parts.append(f"<tr>{tds}</tr>")
    tbody = "\n".join(tr_html_parts)
    return f"""
<div class="tbl-wrap">
  <table class="data-tbl" id="tbl-{sheet_id}">
    <thead><tr>{th_html}</tr></thead>
    <tbody>{tbody}</tbody>
  </table>
</div>"""


def _sheet01_stats(rows: list[list[str]]) -> str:
    ng = sum(1 for r in rows if len(r) > 13 and r[13] == "NG")
    warn = sum(1 for r in rows if len(r) > 13 and r[13] == "要確認")
    ok = sum(1 for r in rows if len(r) > 13 and r[13] == "OK")
    unknown = sum(1 for r in rows if len(r) > 13 and r[13].startswith("未確認"))
    return f"""
<div class="stats-row">
  <div class="stat-box s-ng-box"><div class="stat-num">{ng}</div><div class="stat-lbl">NG</div></div>
  <div class="stat-box s-warn-box"><div class="stat-num">{warn}</div><div class="stat-lbl">要確認</div></div>
  <div class="stat-box s-ok-box"><div class="stat-num">{ok}</div><div class="stat-lbl">OK</div></div>
  <div class="stat-box s-unk-box"><div class="stat-num">{unknown}</div><div class="stat-lbl">未確認</div></div>
  <div class="stat-box s-total-box"><div class="stat-num">{len(rows)}</div><div class="stat-lbl">合計件数</div></div>
</div>"""


def _render_sheet(sid: str, label: str, data: dict) -> str:
    header = data["header"]
    rows = data["rows"]
    notices_html = ""
    if "notices" in data and data["notices"]:
        items = "".join(f"<li>{n}</li>" for n in data["notices"])
        notices_html = f'<div class="notice-box"><ul>{items}</ul></div>'
    stats_html = _sheet01_stats(rows) if sid == "01" else ""
    search_html = f"""
<div class="toolbar">
  <input class="search-box" type="text" placeholder="🔍 検索 / Qidirish..." oninput="filterTable(this, '{sid}')">
  <span class="row-count" id="count-{sid}">{len(rows)} 件</span>
</div>"""
    table_html = _build_table(header, rows, sid)
    return f"""
<div id="panel-{sid}" class="panel" style="display:none">
  {notices_html}
  {stats_html}
  {search_html}
  {table_html}
</div>"""


CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --navy: #1b3a6b;
  --navy2: #14305a;
  --accent: #2563eb;
  --ok: #166534;
  --ok-bg: #dcfce7;
  --ng: #991b1b;
  --ng-bg: #fee2e2;
  --warn: #92400e;
  --warn-bg: #fef3c7;
  --unk: #374151;
  --unk-bg: #f3f4f6;
  --border: #d1d5db;
  --stripe: #f8fafc;
  --text: #111827;
  --radius: 6px;
}
body {
  font-family: "Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,"Noto Sans JP",sans-serif;
  font-size: 12.5px;
  color: var(--text);
  background: #f1f5f9;
  min-height: 100vh;
}
/* ── Header ── */
.app-header {
  background: var(--navy);
  color: #fff;
  padding: 14px 24px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.app-title { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; margin-bottom: 10px; }
.app-meta { font-size: 11px; color: rgba(255,255,255,0.65); margin-bottom: 10px; }
/* ── Tabs ── */
.tabs { display: flex; gap: 2px; }
.tab-btn {
  padding: 8px 14px;
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.75);
  border: none;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s;
}
.tab-btn:hover { background: rgba(255,255,255,0.22); color:#fff; }
.tab-btn.active { background: #fff; color: var(--navy); font-weight: 700; }
/* ── Main content ── */
.main { padding: 20px 24px; }
.panel { animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
/* ── Notice box ── */
.notice-box {
  background: #fff8e1;
  border-left: 3px solid #f59e0b;
  border-radius: 0 var(--radius) var(--radius) 0;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #78350f;
}
.notice-box ul { padding-left: 16px; }
.notice-box li { margin-bottom: 3px; }
/* ── Stats ── */
.stats-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-box {
  flex: 1; min-width: 100px;
  border-radius: var(--radius);
  padding: 12px 16px;
  text-align: center;
  border: 1px solid var(--border);
}
.stat-num { font-size: 28px; font-weight: 700; line-height: 1; }
.stat-lbl { font-size: 11px; margin-top: 4px; }
.s-ng-box   { background: var(--ng-bg);  color: var(--ng);   border-color: #fca5a5; }
.s-warn-box { background: var(--warn-bg); color: var(--warn); border-color: #fcd34d; }
.s-ok-box   { background: var(--ok-bg);  color: var(--ok);   border-color: #86efac; }
.s-unk-box  { background: var(--unk-bg); color: var(--unk);  border-color: #d1d5db; }
.s-total-box{ background: #eff6ff; color: var(--accent); border-color: #bfdbfe; }
/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.search-box {
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 12.5px;
  font-family: inherit;
  width: 320px;
  background: #fff;
}
.search-box:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
.row-count { font-size: 11px; color: #6b7280; }
/* ── Table ── */
.tbl-wrap {
  overflow-x: auto;
  border-radius: var(--radius);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  background: #fff;
}
.data-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-tbl thead tr { background: var(--navy); color: #fff; }
.data-tbl thead th {
  padding: 9px 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.data-tbl thead th:hover { background: var(--navy2); }
.sort-icon { margin-left: 4px; opacity: 0.5; font-size: 10px; }
.data-tbl tbody tr:nth-child(even) { background: var(--stripe); }
.data-tbl tbody tr:hover { background: #eff6ff; }
.data-tbl tbody td {
  padding: 6px 12px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.data-tbl tbody tr.hidden { display: none; }
/* ── Badges ── */
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.s-ng      { background: var(--ng-bg);   color: var(--ng);   }
.s-warn    { background: var(--warn-bg); color: var(--warn); }
.s-ok      { background: var(--ok-bg);   color: var(--ok);   }
.s-unknown { background: var(--unk-bg);  color: var(--unk);  }
"""

JS = """
// ── Tab switching ──
function showTab(id) {
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).style.display = 'block';
  document.querySelector('[data-tab="' + id + '"]').classList.add('active');
}

// ── Search / filter ──
function filterTable(input, sid) {
  const q = input.value.toLowerCase();
  const tbody = document.querySelector('#tbl-' + sid + ' tbody');
  let visible = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    const match = tr.textContent.toLowerCase().includes(q);
    tr.classList.toggle('hidden', !match);
    if (match) visible++;
  });
  document.getElementById('count-' + sid).textContent = visible + ' 件';
}

// ── Sort ──
let _sortState = {};
function sortTable(th) {
  const table = th.closest('table');
  const sid = table.id.replace('tbl-', '');
  const col = parseInt(th.dataset.col);
  const key = sid + '-' + col;
  const asc = !_sortState[key];
  _sortState[key] = asc;

  // reset icons
  th.closest('thead').querySelectorAll('.sort-icon').forEach(s => s.textContent = '⇅');
  th.querySelector('.sort-icon').textContent = asc ? '↑' : '↓';

  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a, b) => {
    const av = a.cells[col] ? a.cells[col].textContent.trim() : '';
    const bv = b.cells[col] ? b.cells[col].textContent.trim() : '';
    const an = parseFloat(av.replace(/[^0-9.-]/g, ''));
    const bn = parseFloat(bv.replace(/[^0-9.-]/g, ''));
    if (!isNaN(an) && !isNaN(bn)) return asc ? an - bn : bn - an;
    return asc ? av.localeCompare(bv, 'ja') : bv.localeCompare(av, 'ja');
  });
  rows.forEach(r => tbody.appendChild(r));
}

// init
showTab('01');
"""


def write_html(sheets: dict, out_path: str) -> None:
    """sheets: {'01': {header, rows, notices?}, '02': ..., ...}"""
    tab_labels = {
        "01": "01_一次承認",
        "02": "02_二次明細",
        "03": "03_差異一覧",
        "04": "04_差戻し文面",
        "05": "05_取込ログ",
        "06": "06_判定ルール",
        "07": "07_マスタ確認",
    }

    tabs_html = "".join(
        f'<button class="tab-btn" data-tab="{sid}" onclick="showTab(\'{sid}\')">{label}</button>'
        for sid, label in tab_labels.items()
        if sid in sheets
    )

    panels_html = "".join(
        _render_sheet(sid, tab_labels.get(sid, sid), sheets[sid])
        for sid in tab_labels
        if sid in sheets
    )

    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    html = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>出張精算 承認チェックシート</title>
<style>{CSS}</style>
</head>
<body>
<div class="app-header">
  <div class="app-title">出張精算 承認チェックシート ビューワー</div>
  <div class="app-meta">生成日時: {stamp}</div>
  <div class="tabs">{tabs_html}</div>
</div>
<div class="main">
  {panels_html}
</div>
<script>{JS}</script>
</body>
</html>"""

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)


def read_excel_and_write_html(xlsx_path: str, html_path: str) -> None:
    """既存の Excel ファイルを読んで HTML を生成する."""
    import openpyxl

    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    sheets: dict = {}

    sheet_map = {
        "01_一次承認チェック": "01",
        "02_二次承認詳細": "02",
        "03_差異一覧": "03",
        "04_差戻し文面候補": "04",
        "05_取込ログ": "05",
        "06_判定ルール": "06",
        "07_マスタ確認": "07",
    }

    for sheet_name, sid in sheet_map.items():
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        all_rows = list(ws.iter_rows(values_only=True))

        if sid == "01":
            notices = []
            header_idx = 0
            for i, row in enumerate(all_rows[:6]):
                v = row[0]
                if v and str(v).startswith("・"):
                    notices.append(str(v))
                elif v and "伝票" in str(v):
                    header_idx = i
                    break
            header = [str(v) if v is not None else "" for v in all_rows[header_idx]]
            data_rows = [
                [str(v) if v is not None else "" for v in r]
                for r in all_rows[header_idx + 1:]
                if any(v is not None for v in r)
            ]
            sheets[sid] = {"header": header, "rows": data_rows, "notices": notices}
        else:
            header = [str(v) if v is not None else "" for v in all_rows[0]]
            data_rows = [
                [str(v) if v is not None else "" for v in r]
                for r in all_rows[1:]
                if any(v is not None for v in r)
            ]
            sheets[sid] = {"header": header, "rows": data_rows}

    write_html(sheets, html_path)
    print(f"HTML 出力: {html_path}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python3 html_writer_web.py <excel_path> [html_path]")
        sys.exit(1)
    xlsx = sys.argv[1]
    html = sys.argv[2] if len(sys.argv) > 2 else xlsx.replace(".xlsx", ".html")
    read_excel_and_write_html(xlsx, html)
