'use strict';

const fuzz = require('fuzzball');
const { norm, normalizePlace } = require('../normalize');

function buildCustomerIndex(customers) {
  const byBase = new Map();  // base → [customers]
  for (const c of customers) {
    const base = c.nameNormBase;
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(c);
  }
  return { customers, byBase, bases: [...byBase.keys()] };
}

function residualTokens(queryBase, candBases) {
  let q = queryBase;
  for (const cb of candBases) q = q.replace(cb, '');
  return q.trim();
}

function hasToken(cust, tokens) {
  if (!tokens) return false;
  const tok = tokens.toLowerCase();
  if (!tok) return false;
  return (
    (cust.siteToken && cust.siteToken.includes(tok)) ||
    (cust.nameRaw && cust.nameRaw.toLowerCase().includes(tok)) ||
    (cust.prefecture && cust.prefecture.toLowerCase().includes(tok))
  );
}

function matchPlace(text, cidx, cfg) {
  if (!text) return { status: '未突合', customerNo: null, customerName: null, score: 0, candidates: [] };

  const threshold = cfg.placeMatchThreshold || 82;
  const aliasMap  = cfg.placeAliases || {};

  // Apply aliases
  let queryText = String(text).normalize('NFKC');
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    if (queryText.includes(alias)) queryText = queryText.replace(alias, canonical);
  }

  const [queryBase, querySiteToken] = normalizePlace(queryText);

  // 1. Exact base match
  let candidates = [];
  if (cidx.byBase.has(queryBase)) {
    candidates = cidx.byBase.get(queryBase).map(c => ({ c, score: 100 }));
  }

  // 2. Fuzzy match if no exact
  if (candidates.length === 0) {
    const scores = [];
    for (const base of cidx.bases) {
      const score = fuzz.partial_ratio(queryBase, base);
      if (score >= threshold) {
        scores.push({ base, score });
      }
    }
    // Near-best pool (within 3 of best)
    if (scores.length > 0) {
      const best = Math.max(...scores.map(s => s.score));
      for (const { base, score } of scores) {
        if (score >= best - 3) {
          for (const c of cidx.byBase.get(base)) {
            candidates.push({ c, score });
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    return { status: '未突合', customerNo: null, customerName: null, score: 0, distanceBand: null, kmLower: null, kmUpper: null, candidates: [] };
  }

  // Tie-break
  const score = Math.max(...candidates.map(x => x.score));

  // 1. Site token uniquely identifies
  const siteTokenToCheck = querySiteToken || residualTokens(queryBase, candidates.map(x => x.c.nameNormBase));
  if (siteTokenToCheck) {
    const tokenMatched = candidates.filter(x => hasToken(x.c, siteTokenToCheck));
    if (tokenMatched.length === 1) return buildResult(tokenMatched[0].c, score, '突合');
  }

  // 2. Substring false-positive guard
  const filtered = candidates.filter(x => {
    const ratio = queryBase.length / Math.max(x.c.nameNormBase.length, 1);
    return ratio >= 0.6;
  });
  if (filtered.length === 0) {
    return { status: '未突合', customerNo: null, customerName: null, score: 0, distanceBand: null, kmLower: null, kmUpper: null, candidates: [] };
  }

  // 3. Deduplicate by customer number
  const byCustNo = new Map();
  for (const x of filtered) byCustNo.set(x.c.customerNo, x.c);
  if (byCustNo.size === 1) {
    return buildResult([...byCustNo.values()][0], score, '突合');
  }

  // 4. All same distance band
  const bands = new Set(filtered.map(x => x.c.distanceBand));
  if (bands.size === 1) {
    const first = filtered[0].c;
    return { status: '複数候補', customerNo: null, customerName: null, score, distanceBand: first.distanceBand, kmLower: first.kmLower, kmUpper: first.kmUpper, candidates: filtered.map(x => x.c.customerNo) };
  }

  return { status: '複数候補', customerNo: null, customerName: null, score, distanceBand: null, kmLower: null, kmUpper: null, candidates: filtered.map(x => x.c.customerNo) };
}

function buildResult(cust, score, status) {
  return {
    status,
    customerNo:   cust.customerNo,
    customerName: cust.nameRaw,
    score,
    distanceBand: cust.distanceBand,
    kmLower:      cust.kmLower,
    kmUpper:      cust.kmUpper,
    candidates:   [cust.customerNo],
  };
}

module.exports = { buildCustomerIndex, matchPlace };
