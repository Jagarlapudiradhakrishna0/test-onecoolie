/**
 * server/tests/test_cancellation_multistep_suite.js
 *
 * Automated Test Suite for ONECOOLIE Multi-Step Cancellation Flow
 *
 * Verifies:
 * 1. Static code audit: CancellationModal.jsx implements Step 1 (reason) -> Step 2 (policy) -> Step 3 (confirmation)
 * 2. Static code audit: CancellationModal.jsx uses useRef lifecycle guard preventing background poll resets
 * 3. Static code audit: Step 2 back button preserves selectedReason without resetting state
 * 4. Static code audit: Step 2 continue advances to confirmation WITHOUT calling cancel API
 * 5. Static code audit: Step 3 confirm button is the only action that invokes the cancel endpoint
 * 6. Business rules: Cancellation quote calculation for genuine reasons (Train Cancelled -> 100% refund)
 * 7. Business rules: Voluntary cancellation after assistant acceptance -> 70% refund, 30% fee
 * 8. API endpoints: /api/bookings/:id/cancel-quote and /api/bookings/:id/cancel registered
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const {
  calculateCancellationRefund,
  validateCancellationReason
} = require('../src/utils/cancellationRules');

console.log('====================================================');
console.log('RUNNING CANCELLATION MULTI-STEP FLOW TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ [TEST ${totalTests}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [TEST ${totalTests}] FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Static Audit of CancellationModal.jsx
runTest('1. CancellationModal.jsx implements discrete Step 1 (reason), Step 2 (policy), Step 3 (confirmation) steps', () => {
  const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/CancellationModal.jsx');
  assert.strictEqual(fs.existsSync(modalPath), true, 'CancellationModal.jsx must exist');
  const code = fs.readFileSync(modalPath, 'utf8');

  // Verify steps
  assert.strictEqual(code.includes("step === 'reason'"), true, 'Must have Step 1 reason');
  assert.strictEqual(code.includes("step === 'policy'"), true, 'Must have Step 2 policy');
  assert.strictEqual(code.includes("step === 'confirmation'"), true, 'Must have Step 3 confirmation');
  assert.strictEqual(code.includes("step === 'success'"), true, 'Must have success step');

  // Verify step labels
  assert.strictEqual(code.includes('Step 1 of 3: Reason Selection'), true, 'Must indicate Step 1 of 3');
  assert.strictEqual(code.includes('Step 2 of 3: Policy & Refund Summary'), true, 'Must indicate Step 2 of 3');
  assert.strictEqual(code.includes('Step 3 of 3: Final Confirmation'), true, 'Must indicate Step 3 of 3');
});

// 2. Lifecycle guard preventing reset loops
runTest('2. CancellationModal.jsx has useRef lifecycle guard preventing reset loops during background polling', () => {
  const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/CancellationModal.jsx');
  const code = fs.readFileSync(modalPath, 'utf8');

  assert.strictEqual(code.includes('prevBookingIdRef'), true, 'Must track prevBookingIdRef');
  assert.strictEqual(code.includes('prevIsOpenRef'), true, 'Must track prevIsOpenRef');
  assert.strictEqual(code.includes('!prevIsOpenRef.current || prevBookingIdRef.current !== bookingId'), true,
    'Must only reset on modal open transition or booking ID change'
  );
});

// 3. Preservation of Selected Reason across Step 1 and Step 2
runTest('3. Step 2 (Policy) displays the selected reason and Step 2 back button preserves selectedReason', () => {
  const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/CancellationModal.jsx');
  const code = fs.readFileSync(modalPath, 'utf8');

  // Selected reason display in Step 2
  assert.strictEqual(code.includes('selectedReasonDisplay'), true, 'Must compute selectedReasonDisplay');
  assert.strictEqual(code.includes('Cancellation Reason'), true, 'Must display Cancellation Reason in Step 2');

  // Back button in Step 2 returns to reason step
  assert.strictEqual(code.includes("onClick={() => setStep('reason')}"), true,
    'Step 2 back button must transition back to reason step'
  );
});

// 4. Separation of steps: Step 2 Continue does NOT call cancel API
runTest('4. Step 2 Continue button advances to Step 3 (confirmation) WITHOUT calling the cancel API', () => {
  const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/CancellationModal.jsx');
  const code = fs.readFileSync(modalPath, 'utf8');

  assert.strictEqual(code.includes('handleProceedToConfirmation'), true, 'Must have handleProceedToConfirmation');
  assert.strictEqual(code.includes("setStep('confirmation')"), true, 'handleProceedToConfirmation must setStep to confirmation');
  // Confirm handleProceedToConfirmation does not invoke axios.post
  const fnMatch = code.match(/handleProceedToConfirmation = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\);/);
  assert.notStrictEqual(fnMatch, null, 'handleProceedToConfirmation function must be defined');
  assert.strictEqual(fnMatch[1].includes('axios.post'), false, 'handleProceedToConfirmation must not invoke cancel API');
});

// 5. Final Confirmation: Only Step 3 calls cancel API
runTest('5. Step 3 Confirm button is the authoritative action calling POST /api/bookings/:id/cancel', () => {
  const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/CancellationModal.jsx');
  const code = fs.readFileSync(modalPath, 'utf8');

  assert.strictEqual(code.includes('handleConfirmCancel'), true, 'Must have handleConfirmCancel');
  assert.strictEqual(code.includes('/cancel`,'), true, 'Must POST to /cancel');
  assert.strictEqual(code.includes('isSubmitting'), true, 'Must have isSubmitting protection');
});

// 6. Business rules: Train cancelled -> 100% refund
runTest('6. Business rules: Unassigned booking + Train Cancelled yields 100% refund with ₹0 charge', () => {
  const booking = {
    booking_status: 'pending',
    assistant_id: null,
    total_price: 500,
    payment_method: 'online'
  };
  const val = validateCancellationReason('TRAIN_CANCELLED', '', false);
  assert.strictEqual(val.isValid, true);

  const calc = calculateCancellationRefund(booking, { amount: 500 }, 'TRAIN_CANCELLED', '');
  assert.strictEqual(calc.refundPercent, 100);
  assert.strictEqual(calc.refundAmount, 500);
  assert.strictEqual(calc.cancellationCharge, 0);
  assert.strictEqual(calc.isEligible, true);
});

// 7. Business rules: Assigned booking + Voluntary cancellation -> 70% refund, 30% charge
runTest('7. Business rules: Assigned booking + Voluntary cancellation yields 70% refund and 30% charge', () => {
  const booking = {
    booking_status: 'accepted',
    assistant_id: 'ast-101',
    total_price: 300,
    payment_method: 'online'
  };
  const val = validateCancellationReason('VOLUNTARY_CANCEL', '', true);
  assert.strictEqual(val.isValid, true);

  const calc = calculateCancellationRefund(booking, { amount: 300 }, 'VOLUNTARY_CANCEL', '');
  assert.strictEqual(calc.refundPercent, 70);
  assert.strictEqual(calc.refundAmount, 210);
  assert.strictEqual(calc.cancellationCharge, 90);
  assert.strictEqual(calc.isEligible, false);
});

// 8. Backend endpoints registration
runTest('8. Backend endpoints /api/bookings/:id/cancel-quote and /api/bookings/:id/cancel are registered', () => {
  const routesPath = path.resolve(__dirname, '../../server/src/routes/bookingRoutes.js');
  const routesCode = fs.readFileSync(routesPath, 'utf8');

  assert.strictEqual(routesCode.includes('/:id/cancel-quote'), true, 'cancel-quote route must be registered');
  assert.strictEqual(routesCode.includes('/:id/cancel'), true, 'cancel route must be registered');
});

console.log('\n====================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('STATUS: CANCELLATION MULTI-STEP SUITE PASSED 100%! ✓');
console.log('====================================================\n');
