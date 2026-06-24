'use strict';

const XLSX = require('xlsx');
const { norm, parseJpDate, parseTime, toDateKey, toYearMonth } = require('../normalize');
const { PRESENCE } = require('../models');

const LEAVE_CONTENTS = new Set(['有給', '特休', '忌引', '慶弔', '育休', '産休', '病休', '特別休暇', '年休']);

function cellVal(row, idxMap, name) {
  const idx = idxMap[name];
  if (idx === undefined || idx >= row.length) return null;
  const v = row[idx];
  return (v === null || v === undefined || v === '') ? null : v;
}

function asStr(v) {
  if (v === null || v === undefined || v === '') return null;
  return String(v).trim() || null;
}

function parseMovetime(v) {
  if (!v) return null;
  if (v instanceof Date) return parseTime(v);
  const s = String(v).trim();
  // Could be full datetime string or just time
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10), second: m[3] ? parseInt(m[3], 10) : 0 };
  return null;
}

function derivePresence(calendarType, clockIn, teleworkIn, holidayWorkMinutes, applicationContent) {
  const isHoliday = calendarType && (String(calendarType).includes('法定外') || String(calendarType).includes('法定内'));
  const hasClockIn = !!clockIn;
  const hasTelework = !!teleworkIn;
  const appContent = asStr(applicationContent) || '';
  const hwMin = holidayWorkMinutes ? parseInt(holidayWorkMinutes, 10) : 0;

  if (hasClockIn && isHoliday) return PRESENCE.HOLIDAY_WORK;
  if (hasClockIn) return PRESENCE.OFFICE;
  if (hasTelework) return PRESENCE.TELEWORK;
  if (isHoliday && (hwMin > 0 || appContent.includes('休日出勤'))) return PRESENCE.HOLIDAY_WORK;
  if (isHoliday) return PRESENCE.NONWORK;

  // Weekday + leave application
  if (appContent) {
    for (const lc of LEAVE_CONTENTS) {
      if (appContent.includes(lc)) return PRESENCE.LEAVE;
    }
  }
  return PRESENCE.UNKNOWN;
}

function loadAttendance(paths) {
  const days = [];

  for (const fpath of paths) {
    let wb;
    try {
      wb = XLSX.readFile(fpath, { cellDates: true });
    } catch (e) {
      console.warn(`  [attendance] Cannot read ${fpath}: ${e.message}`);
      continue;
    }

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
      if (rows.length < 2) continue;

      // Build header map (first row)
      const headerRow = rows[0];
      const idxMap = {};
      for (let i = 0; i < headerRow.length; i++) {
        const h = asStr(headerRow[i]);
        if (h && !(h in idxMap)) idxMap[h] = i;
      }

      for (let ri = 1; ri < rows.length; ri++) {
        const row = rows[ri];
        const empId   = cellVal(row, idxMap, '社員番号');
        const nameRaw = asStr(cellVal(row, idxMap, '氏名'));
        const dateRaw = cellVal(row, idxMap, '日付');
        if (!nameRaw && !empId) continue;

        const date = parseJpDate(dateRaw);
        if (!date) continue;

        const calType  = asStr(cellVal(row, idxMap, 'カレンダー'));
        const clockIn  = asStr(cellVal(row, idxMap, '出勤時刻'));
        const clockOut = asStr(cellVal(row, idxMap, '退勤時刻'));
        const twIn     = asStr(cellVal(row, idxMap, 'テレワーク出勤時刻'));
        const twOut    = asStr(cellVal(row, idxMap, 'テレワーク退勤時刻'));
        const hwMin    = cellVal(row, idxMap, '休日出勤時間(分)');
        const appCont  = asStr(cellVal(row, idxMap, '申請内容'));
        const dept     = asStr(cellVal(row, idxMap, '部門'));

        // Movement times (up to 2 pairs)
        const move1Start = parseMovetime(cellVal(row, idxMap, '移動開始'));
        const move1End   = parseMovetime(cellVal(row, idxMap, '移動終了'));
        const move2Start = parseMovetime(cellVal(row, idxMap, '移動2開始'));
        const move2End   = parseMovetime(cellVal(row, idxMap, '移動2終了'));

        const presence = derivePresence(calType, clockIn, twIn, hwMin, appCont);

        days.push({
          empId:      asStr(empId),
          nameRaw,
          nameNorm:   norm(nameRaw),
          date,
          dateKey:    toDateKey(date),
          yearMonth:  toYearMonth(date),
          clockIn:    parseTime(clockIn),
          clockOut:   parseTime(clockOut),
          teleworkIn: parseTime(twIn),
          teleworkOut: parseTime(twOut),
          move1Start, move1End, move2Start, move2End,
          presence,
          applicationContent: appCont,
          department: dept,
          calendarType: calType,
        });
      }
    }
  }

  return days;
}

// Build lookup: { nameNorm+dateKey → AttendanceDay }
function buildAttendanceLookup(days) {
  const byKey = new Map();  // `${nameNorm}|${dateKey}` → day
  const months = new Set();

  for (const d of days) {
    const k = `${d.nameNorm}|${d.dateKey}`;
    if (!byKey.has(k)) byKey.set(k, d);
    if (d.yearMonth) months.add(d.yearMonth);
  }

  return {
    get(nameNorm, dateKey) {
      return byKey.get(`${nameNorm}|${dateKey}`) || null;
    },
    hasMonth(yearMonth) {
      return months.has(yearMonth);
    },
    months: [...months].sort(),
  };
}

module.exports = { loadAttendance, buildAttendanceLookup };
