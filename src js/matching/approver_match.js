'use strict';

const { norm } = require('../normalize');

function buildApproverIndex(rules) {
  const idx = new Map();
  for (const rule of rules) {
    idx.set(rule.nameNorm, rule);
  }
  return idx;
}

function expectedTripApprover(employeeNameNorm, idx) {
  const key = norm(employeeNameNorm);
  return idx.get(key) || null;
}

module.exports = { buildApproverIndex, expectedTripApprover };
