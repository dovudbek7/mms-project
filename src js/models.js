'use strict';

const OK           = 'OK';
const NEEDS_CHECK  = 'NEEDS_CHECK';
const NG           = 'NG';
const UNMATCHED    = 'UNMATCHED';
const MULTI        = 'MULTI';
const RULE_MISSING = 'RULE_MISSING';
const ATT_MISSING  = 'ATT_MISSING';

const SEVERITY = {
  [OK]:           0,
  [ATT_MISSING]:  1,
  [RULE_MISSING]: 1,
  [UNMATCHED]:    2,
  [NEEDS_CHECK]:  3,
  [MULTI]:        3,
  [NG]:           4,
};

function worstStatus(statuses) {
  if (!statuses || statuses.length === 0) return OK;
  return statuses.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), OK);
}

// Maps internal status → axis-specific display vocabulary
function toAxisVocab(status, axis) {
  const AXIS_OK = { trip_reality: 'OK', labor: 'OK', amount: 'OK', duplicate: 'OK', receipt: 'OK', approval_route: 'OK' };
  if (status === OK) return 'OK';
  if (status === NG) {
    // only trip_reality and approval_route can surface NG directly; others → 要確認
    if (axis === 'trip_reality' || axis === 'approval_route' || axis === 'amount' || axis === 'duplicate') return 'NG';
    return '要確認';
  }
  if (status === NEEDS_CHECK) return '要確認';
  if (status === UNMATCHED)   return '未突合';
  if (status === MULTI)       return '複数候補';
  if (status === RULE_MISSING) return '未確認(規程未提供)';
  if (status === ATT_MISSING)  return '未確認(勤怠データ欠落)';
  return status;
}

// Attendance presence codes
const PRESENCE = {
  OFFICE:       'OFFICE',
  TELEWORK:     'TELEWORK',
  HOLIDAY_WORK: 'HOLIDAY_WORK',
  NONWORK:      'NONWORK',
  LEAVE:        'LEAVE',
  UNKNOWN:      'UNKNOWN',
};

module.exports = {
  OK, NEEDS_CHECK, NG, UNMATCHED, MULTI, RULE_MISSING, ATT_MISSING,
  SEVERITY, PRESENCE,
  worstStatus, toAxisVocab,
};
