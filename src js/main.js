'use strict';

const path = require('path');
const cfg  = require('./config');

const { loadExpenseReports }  = require('./loaders/expense_loader');
const { loadAttendance, buildAttendanceLookup } = require('./loaders/attendance_loader');
const { loadEmployees }       = require('./loaders/employee_loader');
const { loadCustomers }       = require('./loaders/customer_loader');
const { loadApproverRules }   = require('./loaders/approver_loader');
const { buildEmployeeIndex }  = require('./matching/employee_match');
const { buildApproverIndex }  = require('./matching/approver_match');
const { buildCustomerIndex }  = require('./matching/place_match');
const { enrichReports, buildCheckSheet } = require('./checksheet');
const { writeExcel }          = require('./excel_writer');

function stamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function run() {
  const ts = stamp();
  const importLog = [];

  function step(no, label, fn) {
    process.stdout.write(`[${no}/5] ${label} 読込 ...\n`);
    const t0 = Date.now();
    try {
      const result = fn();
      const count = Array.isArray(result) ? result.length : '?';
      process.stdout.write(`      -> ${count} 件\n`);
      importLog.push({ 'ステップ': no, 'ラベル': label, '件数': count, 'ステータス': 'OK', '時刻': new Date().toISOString() });
      return result;
    } catch (e) {
      process.stdout.write(`      -> エラー: ${e.message}\n`);
      importLog.push({ 'ステップ': no, 'ラベル': label, '件数': 0, 'ステータス': `ERROR: ${e.message}`, '時刻': new Date().toISOString() });
      throw e;
    }
  }

  const reports   = step(1, '出張精算CSV',  () => loadExpenseReports(cfg.expenseCsvPath));
  const attDays   = step(2, '勤怠(出勤簿)', () => loadAttendance(cfg.attendancePaths));
  const employees = step(3, '社員マスタ',   () => loadEmployees(cfg.employeeMasterPath, cfg.masterPassword));
  const customers = step(4, '顧客マスタ',   () => loadCustomers(cfg.customerMasterPath, cfg.masterPassword));
  const approverRules = step(5, '承認者名簿', () => loadApproverRules(cfg.approverRosterPath, cfg.approverRosterSheet));

  process.stdout.write(`[*] enrich + 判定 + 出力生成 ...\n`);

  const attLookup   = buildAttendanceLookup(attDays);
  const empIdx      = buildEmployeeIndex(employees);
  const custIdx     = buildCustomerIndex(customers);
  const approverIdx = buildApproverIndex(approverRules);

  enrichReports(reports, empIdx, custIdx, cfg);
  const { primaryRows, secondaryRows, diffRows, rejectRows, rulesRows, masterRows } = buildCheckSheet(reports, attLookup, empIdx, approverIdx, cfg);

  const sheetsData = {
    primaryRows,
    secondaryRows,
    diffRows,
    rejectRows,
    importLog,
    rulesRows,
    masterRows,
  };

  const outPath = path.join(cfg.outputDir, `${cfg.outputPrefix}_${ts}.xlsx`);
  await writeExcel(sheetsData, cfg, outPath);

  // Summary
  const counter = {};
  for (const row of primaryRows) {
    const v = row['総合判定'] || 'Unknown';
    counter[v] = (counter[v] || 0) + 1;
  }

  process.stdout.write('\n=== 総合判定 内訳 ===\n');
  for (const [k, v] of Object.entries(counter).sort((a,b) => b[1]-a[1])) {
    process.stdout.write(`  ${k}: ${v}\n`);
  }
  process.stdout.write(`\n出力: ${outPath}\n`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
