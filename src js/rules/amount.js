'use strict';

const { OK, NEEDS_CHECK, NG, RULE_MISSING, worstStatus } = require('../models');

function limitFor(limits, key, kmLower) {
  const table = limits[key];
  if (!table || typeof table !== 'object' || kmLower === null || kmLower === undefined) return null;
  let bestKey = null;
  let bestLo  = -1;
  for (const k of Object.keys(table)) {
    const lo = parseInt(k, 10);
    if (!isNaN(lo) && lo <= kmLower && lo > bestLo) { bestLo = lo; bestKey = k; }
  }
  return bestKey !== null ? table[bestKey] : null;
}

function checkIntegrity(report) {
  const reasons = [];
  const evidence = {};
  const statuses = [];

  const gap = report.totalAmount - report.computedTotal;
  const hasAllowance = report.legs.some(l => l.allowanceCdPerdiem || l.allowanceCdLodging || l.allowanceCdStay);

  if (report.computedTotal > report.totalAmount) {
    statuses.push(NG);
    reasons.push(`明細金額合計が申告合計を超過: 計算${report.computedTotal} > 申告${report.totalAmount}`);
    evidence['合計超過'] = { 申告合計: report.totalAmount, 計算合計: report.computedTotal, 超過額: -gap };
  } else if (gap > 0 && !hasAllowance) {
    statuses.push(NEEDS_CHECK);
    reasons.push(`申告合計と明細合計に差額${gap}があるが手当コードなし`);
    evidence['差額要確認'] = { 申告合計: report.totalAmount, 計算合計: report.computedTotal, 差額: gap };
  }

  if (report.actualLegCount !== report.declaredLegCount) {
    statuses.push(NEEDS_CHECK);
    reasons.push(`行数不一致: 宣言${report.declaredLegCount} != 実${report.actualLegCount}`);
    evidence['行数不一致'] = { 宣言行数: report.declaredLegCount, 実明細数: report.actualLegCount };
  }

  const badLegs = report.legs.filter(l => l.amount < 0 || l.subtotal !== l.amount);
  if (badLegs.length > 0) {
    statuses.push(NG);
    reasons.push(`明細金額異常(${badLegs.length}件)`);
    evidence['明細金額異常'] = badLegs.map(l => ({ 明細No: l.legNo, 金額: l.amount, 小計: l.subtotal }));
  }

  return { status: worstStatus(statuses), reasons, evidence };
}

function checkRules(report, cfg) {
  if (!cfg.hasAmountRules()) {
    return { status: RULE_MISSING, reasons: ['旅費規定 未提供のため金額上限判定不可'], evidence: { 規程: '未提供' } };
  }

  const limits = cfg.amountLimits;
  const statuses = [];
  const overs = [];
  const unresolved = [];

  for (const leg of report.legs) {
    if (leg.allowanceCdPerdiem) {
      const cap = limitFor(limits, '日当', leg.destKmLower);
      if (cap === null) {
        unresolved.push({ 明細No: leg.legNo, 種別: '日当', 金額: leg.amount, km下限: leg.destKmLower, 理由: '距離区分未確定' });
      } else if (leg.amount > cap) {
        overs.push({ 明細No: leg.legNo, 種別: '日当', 金額: leg.amount, 上限: cap });
      }
    }
    if (leg.allowanceCdLodging) {
      const cap = limits['宿泊料上限'];
      if (cap === null || cap === undefined) {
        unresolved.push({ 明細No: leg.legNo, 種別: '宿泊料', 金額: leg.amount, 理由: '宿泊料上限未定義' });
      } else if (leg.amount > cap) {
        overs.push({ 明細No: leg.legNo, 種別: '宿泊料', 金額: leg.amount, 上限: cap });
      }
    }
  }

  if (overs.length > 0) { statuses.push(NG); }
  if (unresolved.length > 0) { statuses.push(NEEDS_CHECK); }
  if (overs.length === 0 && unresolved.length === 0) statuses.push(OK);

  const evidence = {};
  if (overs.length > 0) evidence['金額上限超過'] = overs;
  if (unresolved.length > 0) evidence['上限未検証'] = unresolved;

  const reasons = [];
  if (overs.length > 0) reasons.push(`金額上限超過(${overs.length}件)`);
  if (unresolved.length > 0) reasons.push(`上限未検証(${unresolved.length}件)`);

  return { status: worstStatus(statuses), reasons, evidence };
}

function checkAmount(report, cfg) {
  const { status: integStatus, reasons: integReasons, evidence: integEv } = checkIntegrity(report);
  const { status: ruleStatus, reasons: ruleReasons, evidence: ruleEv }   = checkRules(report, cfg);

  const overall = worstStatus([integStatus, ruleStatus]);
  const reasons = [...integReasons, ...ruleReasons];
  const detail  = reasons.length > 0 ? reasons.join(' / ') : '金額整合性: 問題なし';
  const evidence = Object.assign({}, integEv, ruleEv, { 整合性判定: integStatus, 規程判定: ruleStatus });

  let suggestion = '';
  if (overall === NG || overall === NEEDS_CHECK) {
    const parts = [];
    if (integEv['合計超過']) parts.push('明細金額の合計が申告合計を超過しています。金額を確認・修正してください');
    if (integEv['差額要確認']) parts.push('申告合計と明細合計の差額の内訳を確認してください');
    if (ruleEv['金額上限超過']) parts.push('旅費規定の上限を超過した明細の妥当性を確認してください');
    suggestion = parts.join('。') + (parts.length ? '。' : '');
  }

  return { status: overall, detail, evidence, suggestion };
}

module.exports = { checkAmount };
