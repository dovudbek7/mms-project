'use strict';

const { OK, NEEDS_CHECK, NG, ATT_MISSING, worstStatus } = require('../models');
const { PRESENCE } = require('../models');
const { toYearMonth } = require('../normalize');

function hasMovement(day) {
  return day && (day.move1Start || day.move1End || day.move2Start || day.move2End);
}

function checkTripReality(report, attLookup, cfg) {
  const nameNorm = report.resolvedNameNorm || report.inputterNorm;

  // Collect trip dates from movement/destination legs
  const destLegs = report.legs.filter(l => l.destRaw && l.date);
  if (destLegs.length === 0) {
    return { status: OK, detail: '出張実態: 対象明細なし', evidence: {}, suggestion: '' };
  }

  const tripDateKeys = [...new Set(destLegs.map(l => l.dateKey).filter(Boolean))];

  // Check attendance month availability
  const missingMonths = [];
  for (const dk of tripDateKeys) {
    const ym = dk ? dk.slice(0, 7) : null;
    if (ym && !attLookup.hasMonth(ym)) {
      if (!missingMonths.includes(ym)) missingMonths.push(ym);
    }
  }

  if (missingMonths.length > 0 && !cfg.allowAdjacentMonthAttendance) {
    return {
      status: ATT_MISSING,
      detail: `出張実態: 勤怠データ未提供(${missingMonths.join(', ')})`,
      evidence: { missingMonths, tripDates: tripDateKeys },
      suggestion: '',
    };
  }

  const leaveDates    = [];
  const corrobDates   = [];
  const noRecordDates = [];
  const statuses      = [];

  for (const dk of tripDateKeys) {
    const day = attLookup.get(nameNorm, dk);
    if (!day) {
      noRecordDates.push(dk);
      continue;
    }
    if (day.presence === PRESENCE.LEAVE || day.presence === PRESENCE.NONWORK) {
      leaveDates.push(dk);
    } else if (day.presence === PRESENCE.OFFICE || day.presence === PRESENCE.TELEWORK ||
               day.presence === PRESENCE.HOLIDAY_WORK || hasMovement(day)) {
      corrobDates.push(dk);
    }
    // Check if destination legs matched customer
    const dayDestLegs = destLegs.filter(l => l.dateKey === dk);
    const allMatched = dayDestLegs.every(l => l.customerNo || l.status === '突合' || l.status === '別名突合');
    if (allMatched && day.presence !== PRESENCE.LEAVE) corrobDates.push(dk);
  }

  if (leaveDates.length > 0) {
    statuses.push(NG);
  }
  const allDest = destLegs.every(l => l.customerNo);
  if (corrobDates.length === tripDateKeys.length && leaveDates.length === 0) {
    statuses.push(OK);
  } else {
    if (noRecordDates.length > 0) statuses.push(NEEDS_CHECK);
    if (leaveDates.length === 0 && corrobDates.length < tripDateKeys.length) statuses.push(NEEDS_CHECK);
  }

  const status = worstStatus(statuses.length > 0 ? statuses : [NEEDS_CHECK]);

  let detail = `出張実態: `;
  const parts = [];
  if (leaveDates.length > 0) parts.push(`休暇日と出張日重複(${leaveDates.join(', ')})`);
  if (noRecordDates.length > 0) parts.push(`勤怠記録なし(${noRecordDates.join(', ')})`);
  if (corrobDates.length > 0) parts.push(`裏付けあり(${corrobDates.length}日)`);
  detail += parts.join(' / ') || '確認完了';

  const suggestion = leaveDates.length > 0
    ? `休暇取得日(${leaveDates.join(', ')})に出張申請があります。出張実態を確認してください。`
    : noRecordDates.length > 0 ? '勤怠記録のない日の出張申請があります。出張実態を確認してください。' : '';

  return { status, detail, evidence: { leaveDates, corrobDates, noRecordDates, tripDateKeys }, suggestion };
}

module.exports = { checkTripReality };
