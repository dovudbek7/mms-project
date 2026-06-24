'use strict';

const fs   = require('fs');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');
const { norm, normApprover, parseMoney, parseJpDate, parseTime, toDateKey } = require('../normalize');

const MOVEMENT_TRANSPORTS = new Set(['電車･ﾊﾞｽ', '車', '車(同乗)', 'ﾀｸｼｰ', 'ｶﾞｿﾘﾝ代']);

function findCol(header, token, exclude) {
  for (let i = 0; i < header.length; i++) {
    const h = String(header[i] || '');
    if (h.includes(token) && (!exclude || !exclude.some(e => h.includes(e)))) return i;
  }
  return -1;
}

function cell(row, idx) {
  if (idx < 0 || idx >= row.length) return '';
  const v = row[idx];
  return v === null || v === undefined ? '' : String(v).trim();
}

function loadExpenseReports(csvPath) {
  const buf = fs.readFileSync(csvPath);
  const text = iconv.decode(buf, 'cp932');
  const wb = XLSX.read(text, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) return [];

  const header = rows[0].map(h => String(h || ''));

  // Column resolution
  const COL = {
    voucherNo:      findCol(header, '伝票No'),
    inputter:       findCol(header, '入力者'),
    declaredCount:  findCol(header, '明細行数'),
    totalAmount:    findCol(header, '合計金額'),
    date:           findCol(header, '明細情報:日付'),
    transport:      findCol(header, '交通機関'),
    origin:         findCol(header, '出発地'),
    dest:           findCol(header, '到着地'),
    amount:         findCol(header, '金額', ['合計']),
    subtotal:       findCol(header, '小計'),
    receipt:        findCol(header, '領収書'),
    hand1:          findCol(header, '手当1'),
    hand2:          findCol(header, '手当2'),
    hand3:          findCol(header, '手当3'),
    startTime:      findCol(header, '移動開始'),
    endTime:        findCol(header, '移動終了'),
    legNo:          findCol(header, '明細No'),
    approvalStatus: findCol(header, '承認状態'),
  };

  // Approval slots (承認実行者1-5, 承認日1-5)
  const approverCols = [];
  const approvalDateCols = [];
  for (let i = 1; i <= 5; i++) {
    approverCols.push(findCol(header, `承認実行者${i}`));
    approvalDateCols.push(findCol(header, `承認日${i}`));
  }

  const reports = new Map();

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    const vno = cell(row, COL.voucherNo);
    if (!vno) continue;

    if (!reports.has(vno)) {
      // Parse approvers
      const approvers = [];
      for (let i = 0; i < 5; i++) {
        const rawName = cell(row, approverCols[i]);
        if (!rawName) continue;
        const [nameNorm, isConfirm] = normApprover(rawName);
        approvers.push({ nameRaw: rawName, nameNorm, isConfirmOnly: isConfirm, approvalDate: cell(row, approvalDateCols[i]) });
      }

      reports.set(vno, {
        voucherNo:      vno,
        inputterName:   cell(row, COL.inputter),
        inputterNorm:   norm(cell(row, COL.inputter)),
        declaredLegCount: parseInt(cell(row, COL.declaredCount), 10) || 0,
        totalAmount:    parseMoney(cell(row, COL.totalAmount)),
        approvers,
        approvalStatus: cell(row, COL.approvalStatus),
        legs: [],
        // enriched later
        employeeId: null,
        employeeMatchStatus: null,
        resolvedNameNorm: null,
      });
    }

    const rep = reports.get(vno);
    const amountRaw = parseMoney(cell(row, COL.amount));
    const subtotalRaw = parseMoney(cell(row, COL.subtotal));
    const originRaw = cell(row, COL.origin);
    const destRaw   = cell(row, COL.dest);
    const transport = cell(row, COL.transport);

    const isMovement = MOVEMENT_TRANSPORTS.has(transport) && originRaw && destRaw;

    rep.legs.push({
      legNo:            parseInt(cell(row, COL.legNo), 10) || rep.legs.length + 1,
      date:             parseJpDate(cell(row, COL.date)),
      dateKey:          toDateKey(parseJpDate(cell(row, COL.date))),
      transport,
      originRaw,
      originNorm:       norm(originRaw),
      destRaw,
      destNorm:         norm(destRaw),
      amount:           amountRaw,
      subtotal:         subtotalRaw,
      hasReceipt:       cell(row, COL.receipt) === '有',
      allowanceCdPerdiem:  cell(row, COL.hand1) || null,
      allowanceCdLodging:  cell(row, COL.hand2) || null,
      allowanceCdStay:     cell(row, COL.hand3) || null,
      startTime:        parseTime(cell(row, COL.startTime)),
      endTime:          parseTime(cell(row, COL.endTime)),
      isMovement,
      // enriched later
      customerNo: null, customerName: null, matchScore: null,
      distanceBand: null, destKmLower: null, destKmUpper: null,
    });
  }

  const result = Array.from(reports.values()).map(r => {
    r.computedTotal = r.legs.reduce((s, l) => s + l.amount, 0);
    r.actualLegCount = r.legs.length;
    if (r.legs.length > 0) {
      const dates = r.legs.map(l => l.date).filter(Boolean);
      r.minDate = dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
      r.maxDate = dates.length ? dates.reduce((a, b) => a > b ? a : b) : null;
    }
    return r;
  });

  return result.sort((a, b) => a.voucherNo.localeCompare(b.voucherNo));
}

module.exports = { loadExpenseReports };
