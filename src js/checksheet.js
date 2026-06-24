'use strict';

const { worstStatus, toAxisVocab, OK, ATT_MISSING, RULE_MISSING, UNMATCHED, MULTI, NEEDS_CHECK, NG } = require('./models');
const { resolveEmployee }   = require('./matching/employee_match');
const { expectedTripApprover } = require('./matching/approver_match');
const { matchPlace }        = require('./matching/place_match');
const { checkTripReality }  = require('./rules/trip_reality');
const { checkLabor }        = require('./rules/labor');
const { checkAmount }       = require('./rules/amount');
const { checkReceipt }      = require('./rules/receipt');
const { findDuplicateGroups, checkDuplicate } = require('./rules/duplicate');
const { checkApprovalRoute } = require('./rules/approval_route');
const { norm, toDateKey }   = require('./normalize');

const MOVEMENT_SKIP = new Set(['電車･ﾊﾞｽ', '作業･打合せ', '徒歩', '車(同乗)', '車']);

function allowanceFlags(report) {
  return {
    hasPerdiem:  report.legs.some(l => l.allowanceCdPerdiem),
    hasLodging:  report.legs.some(l => l.allowanceCdLodging),
    hasStay:     report.legs.some(l => l.allowanceCdStay),
  };
}

function enrichReports(reports, empIdx, custIdx, cfg) {
  for (const rep of reports) {
    // Resolve employee
    const res = resolveEmployee(rep.inputterName, empIdx, cfg);
    rep.employeeId          = res.employeeId;
    rep.employeeMatchStatus = res.status;
    rep.resolvedNameNorm    = res.employeeId
      ? empIdx.get ? [...empIdx.entries()].find(([,e]) => e.employeeId === res.employeeId)?.[0] : null
      : null;
    if (!rep.resolvedNameNorm) rep.resolvedNameNorm = rep.inputterNorm;

    // Match destinations
    for (const leg of rep.legs) {
      if (!leg.destRaw || MOVEMENT_SKIP.has(leg.transport)) continue;
      const pm = matchPlace(leg.destRaw, custIdx, cfg);
      leg.customerNo    = pm.customerNo;
      leg.customerName  = pm.customerName;
      leg.matchScore    = pm.score;
      leg.matchStatus   = pm.status;
      leg.distanceBand  = pm.distanceBand;
      leg.destKmLower   = pm.kmLower;
      leg.destKmUpper   = pm.kmUpper;
    }
  }
}

function buildCheckSheet(reports, attLookup, empIdx, approverIdx, cfg) {
  const dupGroups = findDuplicateGroups(reports);

  const primaryRows    = [];
  const secondaryRows  = [];
  const diffRows       = [];
  const rejectRows     = [];

  // Collect months from attendance
  const attMonths = attLookup.months.join(', ');

  for (const rep of reports) {
    const axes = {
      trip_reality:   checkTripReality(rep, attLookup, cfg),
      labor:          checkLabor(rep, attLookup, cfg),
      amount:         checkAmount(rep, cfg),
      duplicate:      checkDuplicate(rep, dupGroups),
      receipt:        checkReceipt(rep, cfg),
      approval_route: checkApprovalRoute(rep, approverIdx, cfg),
    };

    const axisStatuses = Object.values(axes).map(r => r.status);
    const overallStatus = worstStatus(axisStatuses);

    // Map to vocab
    const vocabMap = {};
    for (const [axisName, result] of Object.entries(axes)) {
      vocabMap[axisName] = toAxisVocab(result.status, axisName);
    }

    // 要確認項目 list
    const checkItems = Object.entries(vocabMap)
      .filter(([, v]) => v !== 'OK')
      .map(([k]) => axisLabel(k));

    // 差戻し候補
    const suggestions = Object.values(axes)
      .filter(r => r.suggestion)
      .map(r => r.suggestion);

    // overall display
    const overallDisp = displayStatus(overallStatus);

    const allFlags = allowanceFlags(rep);

    // 01 primary row
    primaryRows.push({
      '伝票No.':         rep.voucherNo,
      '入力者名':        rep.inputterName,
      '社員番号':        rep.employeeId || '',
      '所属':            '',  // filled from employee master if available
      '出張期間':        formatPeriod(rep.minDate, rep.maxDate),
      '合計金額':        rep.totalAmount,
      '承認状態':        rep.approvalStatus || '',
      '出張実態':        vocabMap.trip_reality,
      '労務':            vocabMap.labor,
      '金額規程':        vocabMap.amount,
      '二重申請':        vocabMap.duplicate,
      '領収書':          vocabMap.receipt,
      '承認ルート':      vocabMap.approval_route,
      '総合判定':        overallDisp,
      '要確認項目':      checkItems.join('・'),
      '差戻し候補':      suggestions.join('／'),
    });

    // 02 secondary rows (per leg)
    for (const leg of rep.legs) {
      secondaryRows.push({
        '伝票No.':    rep.voucherNo,
        '入力者名':   rep.inputterName,
        '明細No':     leg.legNo,
        '日付':       leg.dateKey || '',
        '交通機関':   leg.transport,
        '出発地':     leg.originRaw,
        '到着地':     leg.destRaw,
        '金額':       leg.amount,
        '領収書':     leg.hasReceipt ? '有' : '無',
        '手当1':      leg.allowanceCdPerdiem || '',
        '手当2':      leg.allowanceCdLodging || '',
        '手当3':      leg.allowanceCdStay || '',
        '顧客突合':   leg.matchStatus || '',
        '顧客名':     leg.customerName || '',
        '距離区分':   leg.distanceBand || '',
      });
    }

    // 03 diff rows (non-OK axes)
    for (const [axisName, result] of Object.entries(axes)) {
      if (result.status === OK) continue;
      diffRows.push({
        '伝票No.':    rep.voucherNo,
        '入力者名':   rep.inputterName,
        '観点':       axisLabel(axisName),
        '判定':       toAxisVocab(result.status, axisName),
        '詳細':       result.detail,
        '差戻し候補': result.suggestion || '',
      });
    }

    // 04 reject rows
    if (suggestions.length > 0) {
      rejectRows.push({
        '伝票No.':    rep.voucherNo,
        '入力者名':   rep.inputterName,
        '総合判定':   overallDisp,
        '差戻し文面': suggestions.join('\n'),
      });
    }
  }

  // 05 import log — built in main.js
  // 06 rules
  const rulesRows = buildRuleRows(cfg, attMonths);

  // 07 master check
  const masterRows = buildMasterCheck(reports, cfg);

  return { primaryRows, secondaryRows, diffRows, rejectRows, rulesRows, masterRows };
}

function axisLabel(axis) {
  const map = { trip_reality: '出張実態', labor: '労務', amount: '金額規程', duplicate: '二重申請', receipt: '領収書', approval_route: '承認ルート' };
  return map[axis] || axis;
}

function displayStatus(status) {
  const map = {
    [OK]:           'OK',
    [NEEDS_CHECK]:  '要確認',
    [NG]:           'NG',
    [UNMATCHED]:    '未突合',
    [MULTI]:        '複数候補',
    [RULE_MISSING]: '未確認(規程未提供)',
    [ATT_MISSING]:  '未確認(勤怠データ欠落)',
  };
  return map[status] || status;
}

function formatPeriod(minDate, maxDate) {
  if (!minDate) return '';
  const fmt = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
  if (!maxDate || fmt(minDate) === fmt(maxDate)) return fmt(minDate);
  return `${fmt(minDate)}〜${fmt(maxDate)}`;
}

function buildRuleRows(cfg, attMonths) {
  return [
    { '設定項目': '勤怠データ対象月',       '値': attMonths, '備考': '' },
    { '設定項目': '氏名ファジー閾値',        '値': cfg.fuzzyNameThreshold, '備考': '0-1' },
    { '設定項目': '地名ファジー閾値',        '値': cfg.placeMatchThreshold, '備考': '0-100' },
    { '設定項目': '深夜開始(時刻<)',         '値': cfg.lateNightStartBefore, '備考': '時' },
    { '設定項目': '深夜終了(時刻>=)',        '値': cfg.lateNightEndAfter, '備考': '時' },
    { '設定項目': '日当(50km以上)',           '値': cfg.amountLimits?.['日当']?.['50'] ?? '未提供', '備考': '円/日' },
    { '設定項目': '宿泊料上限',              '値': cfg.amountLimits?.['宿泊料上限'] ?? '未提供', '備考': '円' },
    { '設定項目': '領収書必須金額',          '値': cfg.receiptRequiredAbove ?? '未提供', '備考': '円以上' },
    { '設定項目': '旅費規定',               '値': cfg.hasAmountRules() ? '提供済' : '未提供', '備考': '' },
  ];
}

function buildMasterCheck(reports, cfg) {
  const rows = [];
  const inputters = [...new Set(reports.map(r => r.inputterName))];
  for (const name of inputters) {
    const rep = reports.find(r => r.inputterName === name);
    if (rep && rep.employeeMatchStatus === '未突合') {
      rows.push({ '種別': '未突合申請者', '名前': name, '備考': '社員マスタに未登録' });
    }
  }
  return rows;
}

module.exports = { enrichReports, buildCheckSheet };
