'use strict';

const { OK, NEEDS_CHECK, ATT_MISSING, RULE_MISSING, worstStatus } = require('../models');
const { PRESENCE } = require('../models');
const { toYearMonth } = require('../normalize');

const PLACEHOLDER_TIMES = new Set(['ﾎﾃﾙ', '駐車代', '宿泊税', '作業･打合せ']);

function isLateNight(time, cfg) {
  if (!time) return false;
  return time.hour < cfg.lateNightStartBefore || time.hour >= cfg.lateNightEndAfter;
}

function hasLateNightAllowance(leg) {
  const hasCode = leg.allowanceCdPerdiem || leg.allowanceCdLodging || leg.allowanceCdStay;
  const hasHint = (leg.transport && (leg.transport.includes('深夜') || leg.transport.includes('早朝')));
  return !!(hasCode || hasHint);
}

function movementLegs(report) {
  return report.legs.filter(l =>
    l.startTime && l.endTime && !PLACEHOLDER_TIMES.has(l.transport) && l.date
  );
}

function checkLabor(report, attLookup, cfg) {
  const nameNorm = report.resolvedNameNorm || report.inputterNorm;
  const mLegs = movementLegs(report);

  if (mLegs.length === 0) {
    const hasRule = false;  // overtime limits
    return {
      status: RULE_MISSING,
      detail: '労務: 移動時刻記録なし / 残業・休日限度額は規程未提供',
      evidence: { rulesMissing: true },
      suggestion: '',
    };
  }

  const statuses = [];
  const corrobLegs = [], nonworkLegs = [], lateNightLegs = [], attMissingLegs = [];

  for (const leg of mLegs) {
    const ym = leg.dateKey ? leg.dateKey.slice(0, 7) : null;
    if (ym && !attLookup.hasMonth(ym)) {
      attMissingLegs.push(leg.legNo);
      statuses.push(ATT_MISSING);
      continue;
    }
    const day = attLookup.get(nameNorm, leg.dateKey);
    if (!day) {
      attMissingLegs.push(leg.legNo);
      statuses.push(ATT_MISSING);
      continue;
    }

    const late = isLateNight(leg.startTime, cfg) || isLateNight(leg.endTime, cfg);
    if (late && !hasLateNightAllowance(leg)) {
      lateNightLegs.push(leg.legNo);
      statuses.push(NEEDS_CHECK);
      continue;
    }
    if (day.presence === PRESENCE.LEAVE || day.presence === PRESENCE.NONWORK) {
      nonworkLegs.push(leg.legNo);
      statuses.push(NEEDS_CHECK);
      continue;
    }
    corrobLegs.push(leg.legNo);
    statuses.push(OK);
  }

  // Overtime/holiday rules always missing
  statuses.push(RULE_MISSING);

  const status = worstStatus(statuses);
  const parts = [];
  if (lateNightLegs.length > 0) parts.push(`深夜移動・手当なし(明細${lateNightLegs.join(',')})`);
  if (nonworkLegs.length > 0) parts.push(`非勤務日の移動(明細${nonworkLegs.join(',')})`);
  if (attMissingLegs.length > 0) parts.push(`勤怠データ欠落(明細${attMissingLegs.join(',')})`);
  if (corrobLegs.length > 0) parts.push(`照合済み(${corrobLegs.length}件)`);
  parts.push('残業・休日限度額は規程未提供');

  return {
    status,
    detail: '労務: ' + (parts.join(' / ') || 'OK'),
    evidence: { corrobLegs, nonworkLegs, lateNightLegs, attMissingLegs },
    suggestion: lateNightLegs.length > 0 ? '深夜移動(22時以降/5時前)の明細に深夜手当が付いているか確認してください。' : '',
  };
}

module.exports = { checkLabor };
