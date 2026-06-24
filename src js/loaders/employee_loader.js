'use strict';

const XLSX = require('xlsx');
const { norm } = require('../normalize');
const { decryptXlsx, cleanupDecrypt } = require('./decrypt_helper');

function loadEmployees(filePath, password) {
  let wb;
  let tmp = null;
  try {
    tmp = decryptXlsx(filePath, password);
    wb = XLSX.readFile(tmp, { cellDates: true });
  } catch (e) {
    throw new Error(`employee_loader: cannot read ${filePath}: ${e.message}`);
  } finally {
    cleanupDecrypt(tmp);
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (rows.length < 2) return [];

  // Build header index
  const header = rows[0].map(h => norm(String(h || '')));
  const idx = {};
  for (let i = 0; i < header.length; i++) {
    if (header[i] && !(header[i] in idx)) idx[header[i]] = i;
  }

  function findIdx(...tokens) {
    for (const t of tokens) {
      const k = norm(t);
      if (k in idx) return idx[k];
      // partial match
      const found = Object.keys(idx).find(h => h.includes(k));
      if (found) return idx[found];
    }
    return -1;
  }

  const empIdIdx   = findIdx('社員番号');
  const nameIdx    = findIdx('氏名');
  const emailIdx   = findIdx('メールアドレス', 'email', 'Email');
  const deptIdx    = findIdx('部署', '部門', '所属');
  const jurisIdx   = findIdx('管轄', '管理');

  const seen = new Set();
  const employees = [];

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    const g = i => (i >= 0 && i < row.length && row[i] !== null && row[i] !== undefined) ? String(row[i]).trim() : '';
    const empId = g(empIdIdx);
    const nameRaw = g(nameIdx);
    if (!empId && !nameRaw) continue;

    const nameNorm = norm(nameRaw);
    if (seen.has(nameNorm)) continue;
    seen.add(nameNorm);

    employees.push({
      employeeId:  empId,
      nameRaw,
      nameNorm,
      email:       g(emailIdx),
      department:  g(deptIdx),
      jurisdiction: g(jurisIdx),
    });
  }

  return employees;
}

module.exports = { loadEmployees };
