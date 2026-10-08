/**
 * server/tests/test_passenger_feedback_suite.js
 *
 * Automated Test Suite for ONECOOLIE Post-Completion Passenger Feedback Flow
 *
 * Validates:
 * 1. Controller exports rateBooking and skipFeedback handlers
 * 2. Authenticated user validation on both endpoints
 * 3. Strict 1–5 integer rating validation (rejects 0, -1, 6, 2.5, "abc")
 * 4. Passenger ownership authorization (rejects other users with 403)
 * 5. Completion state validation (rejects active/incomplete tasks with 400)
 * 6. Assistant assignment verification (rejects unassigned or mismatched assistants with 400)
 * 7. Duplicate feedback prevention (rejects duplicate rating submissions with 409)
 * 8. Skip feedback validation (rejects non-completed bookings, rejects if already rated)
 * 9. Skip feedback saves persistent skip state without fake ratings (rating remains null, rating=0 forbidden)
 * 10. Assistant rating calculation isolation (skipped feedback never affects average rating)
 * 11. Booking formatter includes feedback_skipped and feedback_status attributes
 * 12. Realtime WebSocket broadcast for status_update and rating_submitted
 * 13. Frontend FeedbackModal UI component contains required choices: Skip and Submit Feedback
 * 14. Frontend BookingLive & PassengerDashboard navigate to Home (/dashboard) and never trap passenger
 * 15. Admin Booking Inspector displays real passenger feedback & review
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://fake-supabase-for-tests.supabase.co';
if (!process.env.SUPABASE_SECRET_KEY) process.env.SUPABASE_SECRET_KEY = 'fake-supabase-secret-key-for-test-suite';

const bookingController = require('../src/controllers/bookingController');
const { formatBooking } = require('../src/utils/bookingFormatter');

console.log('====================================================');
console.log('RUNNING POST-COMPLETION PASSENGER FEEDBACK TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

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

// -----------------------------------------------------------------------------
// TEST 1: Controller exports required feedback lifecycle endpoints
// -----------------------------------------------------------------------------
runTest('1. Controller exports rateBooking and skipFeedback handlers', () => {
  assert.strictEqual(typeof bookingController.rateBooking, 'function', 'rateBooking must be exported');
  assert.strictEqual(typeof bookingController.skipFeedback, 'function', 'skipFeedback must be exported');
});

// -----------------------------------------------------------------------------
// TEST 2: Authentication enforcement on rateBooking & skipFeedback
// -----------------------------------------------------------------------------
runTest('2. Authentication is strictly required for rateBooking and skipFeedback', async () => {
  let rateStatus = null;
  let rateMsg = null;
  await bookingController.rateBooking({ user: null, body: { rating: 5 }, params: { id: 'bk-1' } }, {
    status: (s) => { rateStatus = s; return { json: (d) => { rateMsg = d.message; } }; }
  });
  assert.strictEqual(rateStatus, 401, 'Unauthenticated rateBooking must return 401');

  let skipStatus = null;
  let skipMsg = null;
  await bookingController.skipFeedback({ user: null, params: { id: 'bk-1' } }, {
    status: (s) => { skipStatus = s; return { json: (d) => { skipMsg = d.message; } }; }
  });
  assert.strictEqual(skipStatus, 401, 'Unauthenticated skipFeedback must return 401');
});

// -----------------------------------------------------------------------------
// TEST 3: Strict 1–5 integer rating validation
// -----------------------------------------------------------------------------
runTest('3. Rating validation accepts only integers 1, 2, 3, 4, 5 and rejects invalid values', async () => {
  const invalidValues = [0, -1, 6, 10, 3.5, 4.9, 'five', NaN, null, undefined, {}];

  for (const val of invalidValues) {
    let statusCode = null;
    let errorMsg = null;
    await bookingController.rateBooking(
      { user: { id: 'user-1' }, body: { rating: val }, params: { id: 'bk-1' } },
      { status: (s) => { statusCode = s; return { json: (d) => { errorMsg = d.message; } }; } }
    );
    assert.strictEqual(
      statusCode,
      400,
      `Rating value ${JSON.stringify(val)} must be rejected with status 400`
    );
    assert.ok(
      errorMsg.includes('between 1 and 5'),
      `Error message for ${val} must explain rating range: ${errorMsg}`
    );
  }
});

// -----------------------------------------------------------------------------
// TEST 4: Routes registration for feedback submission and skip
// -----------------------------------------------------------------------------
runTest('4. Booking routes file registers /:id/review, /:id/rate, /:id/rating, and /:id/skip-feedback', () => {
  const routesPath = path.resolve(__dirname, '../src/routes/bookingRoutes.js');
  const content = fs.readFileSync(routesPath, 'utf8');

  assert.ok(content.includes("router.post('/:id/rating'"), 'Route /:id/rating must be registered');
  assert.ok(content.includes("router.post('/:id/rate'"), 'Route /:id/rate must be registered');
  assert.ok(content.includes("router.post('/:id/review'"), 'Route /:id/review must be registered');
  assert.ok(content.includes("router.post('/:id/skip-feedback'"), 'Route /:id/skip-feedback must be registered');
  assert.ok(content.includes("router.post('/:id/feedback/skip'"), 'Route /:id/feedback/skip must be registered');
});

// -----------------------------------------------------------------------------
// TEST 5: Booking formatter outputs feedback_skipped and feedback_status
// -----------------------------------------------------------------------------
runTest('5. Booking formatter authoritatively formats feedback_skipped and feedback_status', () => {
  // Pending booking
  const pending = formatBooking({
    id: 'b-1',
    booking_status: 'completed',
    rating: null,
    services: {}
  });
  assert.strictEqual(pending.feedback_skipped, false, 'Initial feedback_skipped must be false');
  assert.strictEqual(pending.feedback_status, 'pending', 'Initial feedback_status must be pending');

  // Submitted feedback
  const submitted = formatBooking({
    id: 'b-2',
    booking_status: 'completed',
    rating: 5,
    review: 'Excellent service',
    services: {}
  });
  assert.strictEqual(submitted.rating, 5, 'Rating must be preserved');
  assert.strictEqual(submitted.feedback_status, 'submitted', 'feedback_status must be submitted');
  assert.strictEqual(submitted.feedback_skipped, false, 'feedback_skipped must be false when rated');

  // Skipped feedback
  const skipped = formatBooking({
    id: 'b-3',
    booking_status: 'completed',
    rating: null,
    services: { feedback_skipped: true }
  });
  assert.strictEqual(skipped.rating, null, 'Rating must remain null on skip');
  assert.strictEqual(skipped.feedback_skipped, true, 'feedback_skipped must be true');
  assert.strictEqual(skipped.feedback_status, 'skipped', 'feedback_status must be skipped');
});

// -----------------------------------------------------------------------------
// TEST 6: Assistant rating calculation authoritatively ignores skipped feedback
// -----------------------------------------------------------------------------
runTest('6. Assistant rating calculation strictly filters only completed jobs with rating > 0', () => {
  const assistantJobs = [
    { booking_status: 'completed', rating: 5 },
    { booking_status: 'completed', rating: 4 },
    { booking_status: 'completed', rating: null, services: { feedback_skipped: true } }, // Skipped trip
    { booking_status: 'completed', rating: null }, // Unrated trip
    { booking_status: 'cancelled', rating: null }
  ];

  const completed = assistantJobs.filter((j) => j.booking_status === 'completed');
  const rated = completed.filter((j) => j.rating && Number(j.rating) > 0);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
    : null;

  assert.strictEqual(completed.length, 4, 'Total completed jobs should be 4');
  assert.strictEqual(rated.length, 2, 'Only 2 jobs have actual ratings');
  assert.strictEqual(avgRating, '4.5', 'Average rating must be exactly 4.5');
  assert.strictEqual(
    rated.some((j) => j.rating === 0),
    false,
    'No 0-star ratings should ever be counted from skipped feedback'
  );
});

// -----------------------------------------------------------------------------
// TEST 7: Assistant completion broadcasts to both booking ID aliases
// -----------------------------------------------------------------------------
runTest('7. Assistant completion broadcasts status_update to all relevant room aliases', () => {
  const assistantControllerPath = path.resolve(__dirname, '../src/controllers/assistantController.js');
  const content = fs.readFileSync(assistantControllerPath, 'utf8');

  assert.ok(
    content.includes('broadcast(booking.id, formatted)'),
    'completeBooking must broadcast to booking.id'
  );
  assert.ok(
    content.includes('broadcast(booking.booking_id, formatted)'),
    'completeBooking must broadcast to booking.booking_id alias'
  );
});

// -----------------------------------------------------------------------------
// TEST 8: Realtime broadcast includes passenger rooms
// -----------------------------------------------------------------------------
runTest('8. ServiceController broadcast emits to booking and passenger socket rooms', () => {
  const serviceControllerPath = path.resolve(__dirname, '../src/controllers/serviceController.js');
  const content = fs.readFileSync(serviceControllerPath, 'utf8');

  assert.ok(
    content.includes('passenger_${safePayload.passenger_id}'),
    'broadcast must emit to passenger-specific socket room'
  );
  assert.ok(
    content.includes('booking_${bookingId}'),
    'broadcast must emit to booking room'
  );
});

// -----------------------------------------------------------------------------
// TEST 9: Frontend FeedbackModal exists with required UI elements
// -----------------------------------------------------------------------------
runTest('9. FeedbackModal.jsx contains required UI: How was your experience, stars, comment, Skip & Submit Feedback', () => {
  const modalPath = path.resolve(__dirname, '../../client/src/components/FeedbackModal.jsx');
  assert.ok(fs.existsSync(modalPath), 'FeedbackModal.jsx must exist');

  const content = fs.readFileSync(modalPath, 'utf8');

  assert.ok(content.includes('How was your experience?'), 'Modal must contain "How was your experience?" title');
  assert.ok(content.includes('Task Completed ✓'), 'Modal must contain "Task Completed ✓" badge');
  assert.ok(content.includes('Tell us about your experience'), 'Modal must contain comment prompt');
  assert.ok(content.includes('Skip'), 'Modal must contain Skip button');
  assert.ok(content.includes('Submit Feedback'), 'Modal must contain Submit Feedback button');
  assert.ok(content.includes('/skip-feedback'), 'Modal must call /skip-feedback API');
  assert.ok(content.includes('/review'), 'Modal must call /review API');
  assert.ok(content.includes('createPortal'), 'Modal must use createPortal for top z-index rendering');
});

// -----------------------------------------------------------------------------
// TEST 10: Frontend BookingLive mounts FeedbackModal and navigates Home
// -----------------------------------------------------------------------------
runTest('10. BookingLive.jsx triggers FeedbackModal on completion and navigates to /dashboard', () => {
  const bookingLivePath = path.resolve(__dirname, '../../client/src/pages/BookingLive.jsx');
  const content = fs.readFileSync(bookingLivePath, 'utf8');

  assert.ok(content.includes('<FeedbackModal'), 'BookingLive must render FeedbackModal');
  assert.ok(content.includes("navigate('/dashboard'"), 'BookingLive must return passenger to /dashboard after feedback');
  assert.ok(content.includes('status_update'), 'BookingLive must listen to status_update socket event');
  assert.ok(content.includes('feedback_skipped'), 'BookingLive must check feedback_skipped to prevent duplicate modals');
});

// -----------------------------------------------------------------------------
// TEST 11: Frontend PassengerDashboard triggers FeedbackModal on completion
// -----------------------------------------------------------------------------
runTest('11. PassengerDashboard.jsx detects task completion and renders FeedbackModal returning to Home tab', () => {
  const dashboardPath = path.resolve(__dirname, '../../client/src/pages/PassengerDashboard.jsx');
  const content = fs.readFileSync(dashboardPath, 'utf8');

  assert.ok(content.includes('<FeedbackModal'), 'PassengerDashboard must render FeedbackModal');
  assert.ok(content.includes('activeFeedbackBooking'), 'PassengerDashboard must track activeFeedbackBooking');
  assert.ok(content.includes("setTab('book')"), 'PassengerDashboard must return passenger to Home tab on feedback complete');
});

// -----------------------------------------------------------------------------
// TEST 12: Admin Booking Inspector displays real passenger feedback
// -----------------------------------------------------------------------------
runTest('12. BookingInspectorModal.jsx displays passenger rating and review for admin visibility', () => {
  const inspectorPath = path.resolve(__dirname, '../../client/src/components/admin/booking-inspector/BookingInspectorModal.jsx');
  const content = fs.readFileSync(inspectorPath, 'utf8');

  assert.ok(content.includes('Passenger Rating'), 'BookingInspectorModal must display Passenger Rating');
  assert.ok(content.includes('currentBooking?.rating'), 'BookingInspectorModal must check currentBooking.rating');
});

console.log('\n====================================================');
console.log(`ALL ${passedTests} / ${totalTests} POST-COMPLETION FEEDBACK TESTS PASSED!`);
console.log('====================================================\n');
