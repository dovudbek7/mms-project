'use strict';

const { OK, NEEDS_CHECK, NG, worstStatus } = require('../models');
const { norm } = require('../normalize');

function actorKey(report) {
  return report.employeeId || report.inputterNorm;
}

function strongKey(report, leg) {
  return [actorKey(report), leg.dateKey, leg.originNorm, leg.destNorm, leg.transport, leg.amount].join('|');
}

function weakDest(leg) {
  return leg.customerNo || leg.destNorm;
}

function weakKey(report, leg) {
  return [actorKey(report), leg.dateKey, weakDest(leg)].join('|');
}

function findDuplicateGroups(reports) {
  const strongMap = new Map();  // key → [{voucherNo, legNo, ...}]
  const weakMap   = new Map();

  for (const rep of reports) {
    for (const leg of rep.legs) {
      if (!leg.dateKey || leg.amount === 0) continue;

      const sk = strongKey(rep, leg);
      if (!strongMap.has(sk)) strongMap.set(sk, []);
      strongMap.get(sk).push({ voucherNo: rep.voucherNo, legNo: leg.legNo, amount: leg.amount, transport: leg.transport, dest: leg.destRaw });

      const wk = weakKey(rep, leg);
      if (!weakMap.has(wk)) weakMap.set(wk, []);
      weakMap.get(wk).push({ voucherNo: rep.voucherNo, legNo: leg.legNo, dest: leg.destRaw });
    }
  }

  // Strong duplicates: same key across DIFFERENT vouchers
  const strongGroups = new Map();
  for (const [key, members] of strongMap) {
    const vouchers = [...new Set(members.map(m => m.voucherNo))];
    if (vouchers.length > 1) strongGroups.set(key, members);
  }

  // Weak duplicates: same key across different vouchers (not already in strong)
  const weakGroups = new Map();
  for (const [key, members] of weakMap) {
    const vouchers = [...new Set(members.map(m => m.voucherNo))];
    if (vouchers.length > 1) weakGroups.set(key, members);
  }

  return { strongGroups, weakGroups };
}

function checkDuplicate(report, dupGroups) {
  const { strongGroups, weakGroups } = dupGroups;
  const ngItems       = [];
  const checksItems   = [];

  for (const leg of report.legs) {
    if (!leg.dateKey || leg.amount === 0) continue;

    const sk = strongKey(report, leg);
    if (strongGroups.has(sk)) {
      const others = strongGroups.get(sk).filter(m => m.voucherNo !== report.voucherNo);
      if (others.length > 0) ngItems.push({ legNo: leg.legNo, counterparts: others.map(m => m.voucherNo) });
    }

    const wk = weakKey(report, leg);
    if (weakGroups.has(wk)) {
      const others = weakGroups.get(wk).filter(m => m.voucherNo !== report.voucherNo);
      if (others.length > 0 && !ngItems.some(i => i.legNo === leg.legNo)) {
        checksItems.push({ legNo: leg.legNo, counterparts: others.map(m => m.voucherNo) });
      }
    }
  }

  const statuses = [];
  if (ngItems.length > 0)     statuses.push(NG);
  if (checksItems.length > 0) statuses.push(NEEDS_CHECK);
  if (statuses.length === 0)  statuses.push(OK);

  const status  = worstStatus(statuses);
  const detail  = status === OK ? '二重申請: なし'
    : `二重申請: NG ${ngItems.length}件 / 要確認 ${checksItems.length}件`;
  const suggestion = ngItems.length > 0 ? '同一ルート・金額の明細が他の申請にも存在します。二重申請の可能性があります。' : '';

  return { status, detail, evidence: { ng: ngItems, needs_check: checksItems }, suggestion };
}

module.exports = { findDuplicateGroups, checkDuplicate };
