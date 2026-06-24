'use strict';

const { OK, NEEDS_CHECK, UNMATCHED, worstStatus } = require('../models');
const { norm } = require('../normalize');

function checkApprovalRoute(report, approverIdx, cfg) {
  const lookupName = report.resolvedNameNorm || report.inputterNorm;

  // Applicant not in approver index
  const rule = approverIdx.get(lookupName);
  if (!rule || report.employeeMatchStatus === '未突合') {
    return {
      status: UNMATCHED,
      detail: '承認ルート: 承認者名簿に申請者未登録',
      evidence: { applicant: lookupName, approverRuleFound: false },
      suggestion: '',
    };
  }

  // Not yet approved
  const approvers = report.approvers || [];
  if (approvers.length === 0) {
    return {
      status: NEEDS_CHECK,
      detail: '承認ルート: 未承認',
      evidence: { applicant: lookupName, approvalStatus: report.approvalStatus },
      suggestion: '承認が実施されていません。承認者に確認してください。',
    };
  }

  const expectedNorm = rule.tripApproverNorm;
  if (!expectedNorm) {
    return { status: OK, detail: '承認ルート: 想定承認者未設定', evidence: {}, suggestion: '' };
  }

  // Check if expected approver is in actual approvers
  const actualNorms = approvers.map(a => a.nameNorm);
  const matched = actualNorms.includes(expectedNorm);

  if (matched) {
    // Check confirm-only
    const matchedApprover = approvers.find(a => a.nameNorm === expectedNorm);
    if (matchedApprover && matchedApprover.isConfirmOnly && !cfg.confirmOnlyCountsAsApproval) {
      return {
        status: NEEDS_CHECK,
        detail: `承認ルート: 確認のみ(${rule.tripApproverRaw})`,
        evidence: { expected: expectedNorm, actual: actualNorms, confirmOnly: true },
        suggestion: '承認者が確認専用です。正式承認を依頼してください。',
      };
    }
    return { status: OK, detail: '承認ルート: OK', evidence: { expected: expectedNorm, actual: actualNorms }, suggestion: '' };
  }

  return {
    status: NEEDS_CHECK,
    detail: `承認ルート: 想定承認者(${rule.tripApproverRaw})が実承認者に不在`,
    evidence: { expected: expectedNorm, expectedRaw: rule.tripApproverRaw, actual: actualNorms },
    suggestion: `想定される出張命令者(${rule.tripApproverRaw})の承認が確認できません。承認ルートを確認してください。`,
  };
}

module.exports = { checkApprovalRoute };
