'use strict';

const ExcelJS = require('exceljs');
const path    = require('path');
const fs      = require('fs');

const STATUS_COLORS = {
  'OK':                    'FF92D050',
  '突合':                  'FF92D050',
  '別名突合':              'FFFFFF00',
  '承認済':                'FF92D050',
  '要確認':                'FFFFFF00',
  'NG':                    'FFFF0000',
  '複数候補':              'FFFF0000',
  '不整合':                'FFFF0000',
  '未突合':                'FFD9D9D9',
  '未確認(規程未提供)':    'FFD9D9D9',
  '未確認(勤怠データ欠落)':'FFD9D9D9',
};

const SHEETS = [
  { key: 'primaryRows',   name: '01_一次承認チェック' },
  { key: 'secondaryRows', name: '02_二次承認詳細' },
  { key: 'diffRows',      name: '03_差異一覧' },
  { key: 'rejectRows',    name: '04_差戻し文面候補' },
  { key: 'importLog',     name: '05_取込ログ' },
  { key: 'rulesRows',     name: '06_判定ルール' },
  { key: 'masterRows',    name: '07_マスタ確認' },
];

function fillForValue(val) {
  if (!val) return null;
  const s = String(val);
  if (STATUS_COLORS[s]) return STATUS_COLORS[s];
  if (s.startsWith('未確認')) return 'FFD9D9D9';
  return null;
}

function cjkWidth(s) {
  if (!s) return 0;
  let w = 0;
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    w += (cp > 0x2E7F) ? 2 : 1;
  }
  return w;
}

function writeSheet(wb, sheetName, rows, knownGaps, isFirst) {
  const ws = wb.addWorksheet(sheetName);
  if (!rows || rows.length === 0) {
    ws.addRow(['データなし']);
    return;
  }

  let startRow = 1;

  // Banner on first sheet
  if (isFirst && knownGaps && knownGaps.length > 0) {
    const bannerTitle = ws.addRow(['出張精算 承認チェックシート — 既知の前提・データ欠落 (必ず確認)']);
    bannerTitle.getCell(1).font = { bold: true, color: { argb: 'FF7F3F00' } };
    bannerTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
    ws.mergeCells(1, 1, 1, 8);
    startRow++;

    for (const gap of knownGaps) {
      const gapRow = ws.addRow([`・${gap}`]);
      gapRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      ws.mergeCells(startRow, 1, startRow, 8);
      startRow++;
    }

    ws.addRow([]);
    startRow++;
  }

  const headers = Object.keys(rows[0]);
  const colWidths = headers.map(h => cjkWidth(h) + 2);

  // Header row
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell, ci) => {
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3460' } };
    cell.alignment = { vertical: 'middle', wrapText: false };
  });

  // Data rows
  for (const rowData of rows) {
    const dataRow = ws.addRow(Object.values(rowData));
    dataRow.eachCell((cell, ci) => {
      const val = cell.value;
      const argb = fillForValue(val);
      if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
      cell.alignment = { vertical: 'middle', wrapText: false };
      // Track column width
      const w = cjkWidth(String(val ?? '')) + 2;
      if (w > colWidths[ci - 1]) colWidths[ci - 1] = w;
    });
  }

  // Auto-fit columns (max 60)
  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = Math.min(colWidths[i], 60);
  });

  // Freeze header row
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: startRow }];
}

async function writeExcel(sheetsData, cfg, outPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'mms-checksheet';
  wb.created  = new Date();

  let isFirst = true;
  for (const { key, name } of SHEETS) {
    const rows = sheetsData[key] || [];
    writeSheet(wb, name, rows, cfg.knownGaps, isFirst);
    isFirst = false;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await wb.xlsx.writeFile(outPath);
}

module.exports = { writeExcel };
