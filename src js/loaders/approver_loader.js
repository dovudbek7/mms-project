'use strict';

const XLSX = require('xlsx');
const { norm, normApprover } = require('../normalize');

function cleanLabel(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).normalize('NFKC').replace(/[\r\n]/g, ' ').trim().replace(/\s+/g, ' ');
  return s || null;
}

function loadApproverRules(filePath, sheetName = '20期') {
  let wb;
  try {
    wb = XLSX.readFile(filePath, { cellDates: true });
  } catch (e) {
    throw new Error(`approver_loader: cannot read ${filePath}: ${e.message}`);
  }

  const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Merge info for columns B(1), C(2), D(3)
  const mergeMap = {};  // row → { col: value }
  if (ws['!merges']) {
    for (const merge of ws['!merges']) {
      const { s, e } = merge;
      // Only B,C,D columns (0-indexed: 1,2,3)
      if (s.c >= 1 && s.c <= 3) {
        const originCell = ws[XLSX.utils.encode_cell({ r: s.r, c: s.c })];
        const originVal = originCell ? cleanLabel(originCell.v) : null;
        for (let r = s.r; r <= e.r; r++) {
          if (!mergeMap[r]) mergeMap[r] = {};
          mergeMap[r][s.c] = originVal;
        }
      }
    }
  }

  const rules = [];
  let lastDept = null;

  // Rows 5-62 (0-indexed) = rows 6-63 in spec
  const startRow = 5;
  const endRow   = Math.min(rows.length - 1, 62);

  for (let ri = startRow; ri <= endRow; ri++) {
    const row = rows[ri] || [];
    const g = i => (i < row.length && row[i] !== null && row[i] !== undefined) ? cleanLabel(row[i]) : null;

    // Name is column E (index 4)
    const nameRaw = g(4);
    if (!nameRaw) continue;

    // Dept/section/team from merge map or row
    const deptLabel    = (mergeMap[ri] && mergeMap[ri][1]) || g(1);
    const sectionLabel = (mergeMap[ri] && mergeMap[ri][2]) || g(2);
    const teamLabel    = (mergeMap[ri] && mergeMap[ri][3]) || g(3);

    if (deptLabel) lastDept = deptLabel;
    const effectiveDept = deptLabel || lastDept;

    const tripApproverRaw   = g(5);
    const attendApproverRaw = g(6);

    const [tripApproverNorm, tripConfirmOnly]   = normApprover(tripApproverRaw || '');
    const [attendApproverNorm] = normApprover(attendApproverRaw || '');

    rules.push({
      nameRaw,
      nameNorm:           norm(nameRaw),
      tripApproverRaw,
      tripApproverNorm,
      tripConfirmOnly,
      attendanceApproverRaw:  attendApproverRaw && attendApproverRaw !== '-' ? attendApproverRaw : null,
      attendanceApproverNorm: attendApproverRaw && attendApproverRaw !== '-' ? attendApproverNorm : null,
      department:  effectiveDept,
      section:     sectionLabel,
      team:        teamLabel,
    });
  }

  return rules;
}

module.exports = { loadApproverRules };
