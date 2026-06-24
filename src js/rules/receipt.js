'use strict';

const { OK, NEEDS_CHECK, RULE_MISSING, worstStatus } = require('../models');

function checkReceipt(report, cfg) {
  const hasRule  = cfg.hasReceiptRule();
  const threshold = cfg.receiptRequiredAbove;
  const exempt   = new Set(cfg.receiptExemptTransports || []);
  const highVal  = cfg.receiptHighValueProvisional || 10000;
  const minFlag  = cfg.receiptMinAmountToFlag || 0;

  const statuses = [];
  const flaggedLegs = [];
  let ruleMissingSeen = false;

  for (const leg of report.legs) {
    const amount = leg.amount || 0;
    if (amount <= 0) { statuses.push(OK); continue; }
    if (leg.hasReceipt) { statuses.push(OK); continue; }

    const isExempt = exempt.has(leg.transport);

    if (isExempt) {
      const limit = hasRule ? threshold : highVal;
      if (amount >= limit) {
        if (!hasRule) ruleMissingSeen = true;
        statuses.push(NEEDS_CHECK);
        flaggedLegs.push({ leg_no: leg.legNo, transport: leg.transport, amount, reason: hasRule ? '免除対象だが高額・領収書なし' : '免除対象だが高額・領収書なし(暫定閾値)' });
      } else {
        statuses.push(OK);
      }
      continue;
    }

    // Non-exempt
    if (hasRule) {
      if (amount >= threshold) {
        statuses.push(NEEDS_CHECK);
        flaggedLegs.push({ leg_no: leg.legNo, transport: leg.transport, amount, reason: '高額・領収書なし' });
      } else {
        statuses.push(OK);
      }
    } else {
      if (amount < minFlag) {
        statuses.push(OK);
      } else {
        ruleMissingSeen = true;
        statuses.push(NEEDS_CHECK);
        flaggedLegs.push({ leg_no: leg.legNo, transport: leg.transport, amount, reason: '免除対象外・領収書なし(閾値規程未提供)' });
      }
    }
  }

  const status = worstStatus(statuses);
  const hasExemptHigh = flaggedLegs.some(f => f.reason.includes('免除対象だが'));
  const hasNonExempt  = flaggedLegs.some(f => f.reason.includes('免除対象外'));

  let detail = status === OK ? '領収書: 問題なし' : '';
  if (status !== OK) {
    const parts = [];
    if (ruleMissingSeen) parts.push('領収書要否閾値が規程未提供(暫定判定)');
    parts.push(`要確認の有償・領収書なし明細 ${flaggedLegs.length} 件`);
    detail = '領収書: ' + parts.join(' / ');
  }

  const evidence = { no_receipt_paid_legs: flaggedLegs.length, flagged_legs: flaggedLegs, has_receipt_rule: hasRule, receipt_required_above: threshold };

  let suggestion = '';
  if (status === NEEDS_CHECK) {
    const kinds = [];
    if (hasExemptHigh) kinds.push('免除交通機関だが高額');
    if (hasNonExempt)  kinds.push('免除対象外');
    const kindStr = kinds.join('・') || '高額';
    suggestion = ruleMissingSeen
      ? `${kindStr}の有償明細に領収書がありません。旅費規定の領収書要否を確認の上、領収書の添付を依頼してください。`
      : `${kindStr}の明細に領収書がありません。領収書の添付を依頼してください。`;
  }

  return { status, detail, evidence, suggestion };
}

module.exports = { checkReceipt };
