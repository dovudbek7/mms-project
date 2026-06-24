'use strict';

// NFKC normalize + remove all whitespace
function norm(s) {
  if (!s && s !== 0) return '';
  return String(s).normalize('NFKC').replace(/\s+/g, '');
}

// Extract (確認) suffix → [normalizedName, isConfirmOnly]
function normApprover(s) {
  if (!s) return ['', false];
  const str = String(s).normalize('NFKC').trim();
  const m = str.match(/^(.+?)\s*[（(]確認[）)]\s*$/);
  if (m) return [norm(m[1]), true];
  return [norm(str), false];
}

// Split place name into [base, siteToken]
// e.g. "メイコー石巻" → ["メイコー", "石巻"]
// e.g. "リンクステック[下館工場]" → ["リンクステック", "下館工場"]
function normalizePlace(s) {
  if (!s) return ['', ''];
  let str = String(s).normalize('NFKC').trim();

  // Extract bracket site token
  const bracketM = str.match(/[[\[（(]([^\]）)]+)[)\]）]/);
  const siteToken = bracketM ? norm(bracketM[1]) : '';
  if (bracketM) str = str.replace(bracketM[0], '').trim();

  // Remove corporate suffixes
  str = str.replace(/株式会社|有限会社|合同会社|（株）|\(株\)|㈱/g, '').trim();

  // Lowercase for matching
  const base = norm(str).toLowerCase();
  return [base, siteToken.toLowerCase()];
}

// '150~200 km' → [150, 200]; '500~' → [500, null]
function parseBand(s) {
  if (!s) return [null, null];
  const m = String(s).match(/(\d+)\s*[~～]\s*(\d+)?/);
  if (!m) return [null, null];
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : null];
}

// '¥ 12,500' → 12500
function parseMoney(s) {
  if (s === null || s === undefined || s === '') return 0;
  if (typeof s === 'number') return Math.round(s);
  const cleaned = String(s).replace(/[¥,\s円]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

// Various JP date strings / Excel serial → Date or null
function parseJpDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    return isNaN(d) ? null : d;
  }
  return null;
}

// 'HH:MM:SS' or 'HH:MM' → { hour, minute, second } or null
function parseTime(s) {
  if (!s) return null;
  if (s instanceof Date) {
    return { hour: s.getHours(), minute: s.getMinutes(), second: s.getSeconds() };
  }
  const str = String(s).trim();
  const m = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = m[3] ? parseInt(m[3], 10) : 0;
  if (h > 23 || min > 59 || sec > 59) return null;
  return { hour: h, minute: min, second: sec };
}

// Date → 'YYYY-MM' string for month-based lookups
function toYearMonth(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : parseJpDate(d);
  if (!dt) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

// Date → 'YYYY-MM-DD' string
function toDateKey(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : parseJpDate(d);
  if (!dt) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

module.exports = { norm, normApprover, normalizePlace, parseBand, parseMoney, parseJpDate, parseTime, toYearMonth, toDateKey };
