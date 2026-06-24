'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, '出張精算データ一式');
const RAKU = path.join(DATA, '楽々精算・楽々勤怠データ');
const LIST = path.join(DATA, '顧客・社員リスト');

const config = {
  // --- Input paths ---
  expenseCsvPath:      path.join(RAKU, '出張精算_20260602_085224.csv'),
  employeeMasterPath:  path.join(LIST, '社員リスト_20260608.xlsx'),
  customerMasterPath:  path.join(LIST, '顧客リスト_20260608.xlsx'),
  approverRosterPath:  path.join(DATA, '20期評価者・承認者一覧_20260401.xlsx'),
  attendancePaths: [
    path.join(RAKU, '出勤簿_日別詳細_20260528160105.xlsx'),
    path.join(RAKU, '出勤簿_日別詳細_20260605120823.xlsx'),
  ],
  approverRosterSheet: '20期',

  // --- Output ---
  outputDir:    path.join(ROOT, 'out js'),
  outputPrefix: '出張精算_承認チェックシート',

  // --- Parsing ---
  masterPassword: 'peeg0608',
  csvEncoding:    'cp932',

  // --- Matching thresholds ---
  placeMatchThreshold: 82,   // rapidfuzz partial_ratio equivalent (0-100)
  fuzzyNameThreshold:  0.85, // string-similarity (0-1)
  allowAdjacentMonthAttendance: false,

  // --- Labor thresholds ---
  lateNightStartBefore: 5,   // hour < 5 = late night departure
  lateNightEndAfter:    22,  // hour >= 22 = late night arrival

  // --- Amount rules (J-4-1 国内出張旅費規定 2025-10-01施行) ---
  amountLimits: {
    '日当': { '0': 0, '50': 1700 },
    '宿泊料上限': 13500,
  },
  receiptRequiredAbove: 1000,
  receiptExemptTransports: ['電車･ﾊﾞｽ'],
  receiptHighValueProvisional: 10000,
  receiptMinAmountToFlag: 1000,
  confirmOnlyCountsAsApproval: false,

  // --- Aliases ---
  nameAliases:  { '張学シン': '張学鑫' },
  placeAliases: { 'シムテック': 'SIMMTECH GRAPHICS' },

  // --- Known gaps (banner) ---
  knownGaps: [
    '2026-05 の出勤簿(勤怠)が未提供 — 出張実態・労務の勤怠照合は劣化(advisory)。',
    '宿泊料上限は 13,500円(第３種/第４種 東京23区基準)で設定。管理者(上限15,000円)・東京23区以外(上限9,500円)は上限が異なるため手動確認が必要。',
  ],

  // --- Helpers ---
  hasAmountRules() { return Object.keys(this.amountLimits).length > 0; },
  hasReceiptRule()  { return this.receiptRequiredAbove !== null && this.receiptRequiredAbove !== undefined; },
};

module.exports = config;
