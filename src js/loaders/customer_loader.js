'use strict';

const XLSX = require('xlsx');
const { norm, normalizePlace, parseBand } = require('../normalize');
const { decryptXlsx, cleanupDecrypt } = require('./decrypt_helper');

function findColIdx(header, token) {
  for (let i = 0; i < header.length; i++) {
    if (String(header[i] || '').includes(token)) return i;
  }
  return -1;
}

function loadCustomers(filePath, password) {
  let wb;
  let tmp = null;
  try {
    tmp = decryptXlsx(filePath, password);
    wb = XLSX.readFile(tmp, { cellDates: true });
  } catch (e) {
    throw new Error(`customer_loader: cannot read ${filePath}: ${e.message}`);
  } finally {
    cleanupDecrypt(tmp);
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (rows.length < 2) return [];

  const header = rows[0];
  const nameIdx     = findColIdx(header, '取引先名') >= 0 ? findColIdx(header, '取引先名') : findColIdx(header, '顧客名');
  const custNoIdx   = findColIdx(header, '取引先番号') >= 0 ? findColIdx(header, '取引先番号') : findColIdx(header, '顧客番号');
  const bandIdx     = findColIdx(header, '距離区分');
  const prefIdx     = findColIdx(header, '都道府県');
  const regionIdx   = findColIdx(header, '地域');

  const customers = [];

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    const g = i => (i >= 0 && i < row.length && row[i] !== null && row[i] !== undefined) ? String(row[i]).trim() : '';
    const nameRaw   = g(nameIdx);
    const custNo    = g(custNoIdx);
    if (!nameRaw && !custNo) continue;

    const [base, siteToken] = normalizePlace(nameRaw);
    const bandStr  = g(bandIdx);
    const [kmLower, kmUpper] = parseBand(bandStr);

    customers.push({
      customerNo:    custNo,
      nameRaw,
      nameNormBase:  base,
      siteToken,
      distanceBand:  bandStr,
      kmLower,
      kmUpper,
      prefecture:    g(prefIdx),
      region:        g(regionIdx),
    });
  }

  return customers;
}

module.exports = { loadCustomers };
