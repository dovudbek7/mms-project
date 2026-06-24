'use strict';

const stringSimilarity = require('string-similarity');
const { norm } = require('../normalize');

function buildEmployeeIndex(employees) {
  const idx = new Map();  // nameNorm → employee
  for (const emp of employees) {
    if (!idx.has(emp.nameNorm)) idx.set(emp.nameNorm, emp);
  }
  return idx;
}

function resolveEmployee(name, empIdx, cfg) {
  if (!name) return { employeeId: null, status: '未突合', matchedName: null, score: 0 };

  const nameNorm = norm(name);

  // 1. Exact match
  if (empIdx.has(nameNorm)) {
    const emp = empIdx.get(nameNorm);
    return { employeeId: emp.employeeId, status: '突合', matchedName: emp.nameRaw, score: 1.0 };
  }

  // 2. Alias substitution
  const aliasMap = cfg.nameAliases || {};
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    const aliasNorm = norm(alias);
    const canonNorm = norm(canonical);
    if (nameNorm === aliasNorm && empIdx.has(canonNorm)) {
      const emp = empIdx.get(canonNorm);
      return { employeeId: emp.employeeId, status: '別名突合', matchedName: emp.nameRaw, score: 0.95 };
    }
  }

  // 3. Fuzzy match
  const threshold = cfg.fuzzyNameThreshold || 0.85;
  let bestScore = 0;
  let bestEmp   = null;

  for (const [key, emp] of empIdx) {
    const score = stringSimilarity.compareTwoStrings(nameNorm, key);
    if (score > bestScore) { bestScore = score; bestEmp = emp; }
  }

  if (bestScore >= threshold && bestEmp) {
    return { employeeId: bestEmp.employeeId, status: '別名突合', matchedName: bestEmp.nameRaw, score: bestScore };
  }

  return { employeeId: null, status: '未突合', matchedName: null, score: 0 };
}

module.exports = { buildEmployeeIndex, resolveEmployee };
