/**
 * server/tests/run_all_tests.js
 *
 * ONECOOLIE Master Test Runner
 *
 * Runs all organized security, auth, session, socket, monitoring, reliability,
 * and regression test suites in sequence and prints a comprehensive summary.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const testSuites = [
  { name: '1. Admin Allowlist & Access Control', file: 'tests/auth/test_admin_allowlist.js' },
  { name: '2. Multi-Factor Authentication (MFA)', file: 'tests/auth/test_mfa.js' },
  { name: '3. Server Sessions & Refresh Rotation', file: 'tests/sessions/test_sessions.js' },
  { name: '4. Socket.IO Sessions & Revocation', file: 'tests/socket/test_socket_sessions.js' },
  { name: '5. Production Security & Hardening', file: 'tests/security/test_production_security.js' },
  { name: '6. Security Monitoring & Incidents', file: 'tests/monitoring/test_security_monitoring.js' },
  { name: '7. Production Reliability & DR', file: 'tests/reliability/test_production_reliability.js' },
  { name: '8. Frontend Auth & Interceptor Flow', file: 'tests/regression/test_frontend_integration.js' },
  { name: '9. Audit Log Hardening & Reconciliation', file: 'tests/regression/test_audit_hardening.js' }
];

console.log('====================================================');
console.log('ONECOOLIE COMPREHENSIVE BACKEND VERIFICATION RUNNER');
console.log('====================================================\n');

let allPassed = true;
const results = [];

for (const suite of testSuites) {
  const filePath = path.resolve(__dirname, '..', suite.file);
  console.log(`>>> RUNNING: ${suite.name} (${suite.file})`);

  const start = Date.now();
  const run = spawnSync(process.execPath, [filePath], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (run.status === 0) {
    console.log(`>>> PASSED: ${suite.name} [${duration}s]\n`);
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
  } else {
    console.error(`>>> FAILED: ${suite.name} [Exit code: ${run.status}] [${duration}s]\n`);
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}s` });
    allPassed = false;
  }
}

console.log('====================================================');
console.log('FINAL TEST EXECUTION SUMMARY:');
console.log('====================================================');
results.forEach(r => {
  console.log(`${r.status === 'PASSED' ? '✓' : '✗'} [${r.status}] ${r.name} (${r.duration})`);
});
console.log('====================================================');

if (!allPassed) {
  console.error('\n❌ ONE OR MORE TEST SUITES FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ ALL TEST SUITES PASSED SUCCESSFULLY (100%).');
  process.exit(0);
}
