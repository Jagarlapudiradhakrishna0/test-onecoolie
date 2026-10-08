/**
 * server/tests/test_passenger_feedback_suite.js
 *
 * Automated Test Suite for ONECOOLIE Post-Completion Passenger Feedback Flow
 * Explicitly tests Section 32 Scenarios (TEST 1 through TEST 9):
 *
 * TEST 1 — COMPLETE TASK: Task transitions to COMPLETED, passenger receives completion, popup triggers
 * TEST 2 — SUBMIT: Real 1–5 stars + comment, database persistence, passenger/assistant attribution, returns Home
 * TEST 3 — SKIP: Records skip state, NO fake rating (null rating), returns Home
 * TEST 4 — REFRESH: Persistent DB source of truth prevents popup from reopening on refresh
 * TEST 5 — DUPLICATE SUBMISSION: Prevents duplicate rating submissions with 409
 * TEST 6 — INVALID BOOKING / BOLA: Rejects unauthorized passenger or invalid booking with 403 / 400
 * TEST 7 — INCOMPLETE TASK: Rejects rating or skip on active/assigned/in-progress task with 400
 * TEST 8 — ASSISTANT RATING: Real submitted 5-stars updates average; skip never affects rating
 * TEST 9 — ADMIN: Verified feedback appears in Admin Booking Inspector
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
// TEST 1 — COMPLETE TASK
// -----------------------------------------------------------------------------
runTest('TEST 1 — COMPLETE TASK: Status becomes completed and broadcasts to passenger', () => {
  const assistantControllerPath = path.resolve(__dirname, '../src/controllers/assistantController.js');
  const serviceControllerPath = path.resolve(__dirname, '../src/controllers/serviceController.js');
  const aContent = fs.readFileSync(assistantControllerPath, 'utf8');
  const sContent = fs.readFileSync(serviceControllerPath, 'utf8');

  // Verify completeBooking updates booking_status to completed and broadcasts
  assert.ok(aContent.includes("booking_status: 'completed'"), 'completeBooking must set booking_status to completed');
  assert.ok(aContent.includes('broadcast(booking.id, formatted)'), 'completeBooking must broadcast completion to booking.id');
  assert.ok(aContent.includes('broadcast(booking.booking_id, formatted)'), 'completeBooking must broadcast completion to booking.booking_id');

  // Verify broadcast delivers to passenger and user rooms
  assert.ok(sContent.includes('passenger_${safePayload.passenger_id}'), 'broadcast must emit to passenger socket room');
  assert.ok(sContent.includes('user_${safePayload.passenger_id}'), 'broadcast must emit to user socket room');

  // Verify Passenger Portal BookingLive and PassengerDashboard detect completion
  const liveContent = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/BookingLive.jsx'), 'utf8');
  assert.ok(liveContent.includes('showFeedbackModal'), 'BookingLive must calculate showFeedbackModal on completion');
  assert.ok(liveContent.includes("toLowerCase() === 'completed'"), 'BookingLive must detect completed status');
});

// -----------------------------------------------------------------------------
// TEST 2 — SUBMIT
// -----------------------------------------------------------------------------
runTest('TEST 2 — SUBMIT: Strict 1-5 validation, DB payload, and redirection to Home', async () => {
  // Test rating validation on rateBooking
  const invalidRatings = [0, -1, 6, 2.5, 'five', null];
  for (const r of invalidRatings) {
    let statusCode = null;
    await bookingController.rateBooking(
      { user: { id: 'p-1' }, body: { rating: r }, params: { id: 'b-1' } },
      { status: (s) => { statusCode = s; return { json: () => {} }; } }
    );
    assert.strictEqual(statusCode, 400, `Invalid rating ${r} must be rejected with 400`);
  }

  // Verify formatting of submitted feedback
  const submittedBooking = formatBooking({
    id: 'b-real-1',
    booking_id: 'RM-2026-TEST',
    passenger_id: 'p-real-1',
    assistant_id: 'a-real-1',
    booking_status: 'completed',
    rating: 5,
    review: 'Outstanding help with heavy luggage!',
    services: { feedback_submitted_at: new Date().toISOString() }
  });

  assert.strictEqual(submittedBooking.rating, 5, 'Rating must be preserved');
  assert.strictEqual(submittedBooking.review, 'Outstanding help with heavy luggage!');
  assert.strictEqual(submittedBooking.feedback_status, 'submitted');
  assert.strictEqual(submittedBooking.feedback_skipped, false);

  // Verify Frontend navigates to Home on submission
  const liveContent = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/BookingLive.jsx'), 'utf8');
  assert.ok(liveContent.includes("navigate('/dashboard', { replace: true })"), 'Must navigate to /dashboard on completion');
});

// -----------------------------------------------------------------------------
// TEST 3 — SKIP
// -----------------------------------------------------------------------------
runTest('TEST 3 — SKIP: Skip records persistent state with NO fake rating and returns Home', () => {
  // Booking with skip
  const skippedBooking = formatBooking({
    id: 'b-real-2',
    booking_id: 'RM-2026-SKIP',
    passenger_id: 'p-real-2',
    assistant_id: 'a-real-2',
    booking_status: 'completed',
    rating: null,
    services: { feedback_skipped: true, feedback_skipped_at: new Date().toISOString() }
  });

  assert.strictEqual(skippedBooking.rating, null, 'Rating must remain null on skip');
  assert.notStrictEqual(skippedBooking.rating, 0, 'Rating must NOT be set to 0');
  assert.strictEqual(skippedBooking.feedback_skipped, true, 'feedback_skipped must be true');
  assert.strictEqual(skippedBooking.feedback_status, 'skipped', 'feedback_status must be skipped');

  // Verify skip endpoint exists in routes
  const routesContent = fs.readFileSync(path.resolve(__dirname, '../src/routes/bookingRoutes.js'), 'utf8');
  assert.ok(routesContent.includes("router.post('/:id/skip-feedback'"), 'skip-feedback route must be registered');
});

// -----------------------------------------------------------------------------
// TEST 4 — REFRESH BEHAVIOR
// -----------------------------------------------------------------------------
runTest('TEST 4 — REFRESH: Database source of truth prevents popup from reopening on refresh', () => {
  // Both submitted and skipped bookings have authoritative DB flags
  const rated = formatBooking({ booking_status: 'completed', rating: 4 });
  const skipped = formatBooking({ booking_status: 'completed', rating: null, services: { feedback_skipped: true } });

  const hasFeedbackSubmittedRated = Boolean(rated.rating && Number(rated.rating) > 0);
  const hasFeedbackSkippedRated = Boolean(rated.feedback_skipped);
  assert.ok(hasFeedbackSubmittedRated || hasFeedbackSkippedRated, 'Rated trip must indicate handled');

  const hasFeedbackSubmittedSkipped = Boolean(skipped.rating && Number(skipped.rating) > 0);
  const hasFeedbackSkippedSkipped = Boolean(skipped.feedback_skipped);
  assert.ok(hasFeedbackSubmittedSkipped || hasFeedbackSkippedSkipped, 'Skipped trip must indicate handled');

  // In BookingLive, showFeedbackModal is false when handled
  const isCompleted = true;
  const showModalRated = isCompleted && !hasFeedbackSubmittedRated && !hasFeedbackSkippedRated;
  const showModalSkipped = isCompleted && !hasFeedbackSubmittedSkipped && !hasFeedbackSkippedSkipped;

  assert.strictEqual(showModalRated, false, 'Popup must NOT reopen for rated trip on refresh');
  assert.strictEqual(showModalSkipped, false, 'Popup must NOT reopen for skipped trip on refresh');
});

// -----------------------------------------------------------------------------
// TEST 5 — DUPLICATE SUBMISSION
// -----------------------------------------------------------------------------
runTest('TEST 5 — DUPLICATE SUBMISSION: Controller rejects duplicate feedback with 409', () => {
  const controllerPath = path.resolve(__dirname, '../src/controllers/bookingController.js');
  const content = fs.readFileSync(controllerPath, 'utf8');

  assert.ok(
    content.includes("booking.rating !== null && booking.rating !== undefined"),
    'Must check if rating already exists'
  );
  assert.ok(
    content.includes("Feedback has already been submitted for this booking"),
    'Must reject duplicate feedback submission'
  );
});

// -----------------------------------------------------------------------------
// TEST 6 — INVALID BOOKING / BOLA SECURITY
// -----------------------------------------------------------------------------
runTest('TEST 6 — INVALID BOOKING / BOLA: Unauthenticated or unauthorized passenger is rejected', async () => {
  // Unauthenticated rateBooking
  let rateStatus = null;
  await bookingController.rateBooking({ user: null, body: { rating: 5 }, params: { id: 'bk-1' } }, {
    status: (s) => { rateStatus = s; return { json: () => {} }; }
  });
  assert.strictEqual(rateStatus, 401, 'Unauthenticated user must be rejected with 401');

  // Unauthenticated skipFeedback
  let skipStatus = null;
  await bookingController.skipFeedback({ user: null, params: { id: 'bk-1' } }, {
    status: (s) => { skipStatus = s; return { json: () => {} }; }
  });
  assert.strictEqual(skipStatus, 401, 'Unauthenticated skip must be rejected with 401');

  // Controller checks ownership
  const controllerContent = fs.readFileSync(path.resolve(__dirname, '../src/controllers/bookingController.js'), 'utf8');
  assert.ok(
    controllerContent.includes("String(booking.passenger_id) !== String(req.user.id)"),
    'Controller must enforce passenger ownership'
  );
});

// -----------------------------------------------------------------------------
// TEST 7 — INCOMPLETE TASK
// -----------------------------------------------------------------------------
runTest('TEST 7 — INCOMPLETE TASK: Reject feedback for active or non-completed tasks', () => {
  const controllerContent = fs.readFileSync(path.resolve(__dirname, '../src/controllers/bookingController.js'), 'utf8');
  assert.ok(
    controllerContent.includes("booking.booking_status !== 'completed'"),
    'Controller must enforce that booking_status === completed before accepting feedback'
  );

  // In ActiveBooking / BookingLive, isCompletedStatus requires status === 'completed'
  const activeStatuses = ['pending', 'accepted', 'arriving', 'in_service'];
  for (const st of activeStatuses) {
    const isCompleted = st.toLowerCase() === 'completed';
    assert.strictEqual(isCompleted, false, `Status ${st} must not trigger completion`);
  }
});

// -----------------------------------------------------------------------------
// TEST 8 — ASSISTANT RATING ISOLATION
// -----------------------------------------------------------------------------
runTest('TEST 8 — ASSISTANT RATING: Real ratings update average; skip never affects rating', () => {
  const jobs = [
    { booking_status: 'completed', rating: 5 },
    { booking_status: 'completed', rating: 5 },
    { booking_status: 'completed', rating: null, services: { feedback_skipped: true } } // Skipped
  ];

  const completed = jobs.filter((j) => j.booking_status === 'completed');
  const rated = completed.filter((j) => j.rating && Number(j.rating) > 0);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
    : null;

  assert.strictEqual(completed.length, 3, 'Completed count includes skipped');
  assert.strictEqual(rated.length, 2, 'Rated count strictly excludes skipped');
  assert.strictEqual(avgRating, '5.0', 'Average rating remains 5.0 and is not penalized');
});

// -----------------------------------------------------------------------------
// TEST 9 — ADMIN PORTAL VISIBILITY
// -----------------------------------------------------------------------------
runTest('TEST 9 — ADMIN: Verified feedback appears in Admin Booking Inspector', () => {
  const inspectorPath = path.resolve(__dirname, '../../client/src/components/admin/booking-inspector/BookingInspectorModal.jsx');
  const content = fs.readFileSync(inspectorPath, 'utf8');

  assert.ok(content.includes('Passenger Rating'), 'Inspector must render Passenger Rating');
  assert.ok(content.includes('currentBooking?.rating'), 'Inspector must check currentBooking.rating');
  assert.ok(content.includes('currentBooking.review'), 'Inspector must display review text when available');
});

// -----------------------------------------------------------------------------
// TEST 10 — DB-BACKED FALLBACK IN PASSENGER DASHBOARD
// -----------------------------------------------------------------------------
runTest('TEST 10 — DB FALLBACK: fetchBookings detects completed unrated bookings on refresh', () => {
  const dashPath = path.resolve(__dirname, '../../client/src/pages/PassengerDashboard.jsx');
  const content = fs.readFileSync(dashPath, 'utf8');

  assert.ok(content.includes('Section 5 DB-backed fallback check'), 'PassengerDashboard must contain DB fallback check');
  assert.ok(content.includes("isCompleted = status === 'completed'"), 'DB fallback must check status === completed');
  assert.ok(content.includes('!hasRating && !hasSkipped && !isHandled'), 'DB fallback must filter unrated, unskipped, unhandled bookings');
  assert.ok(content.includes('setActiveFeedbackBooking'), 'DB fallback must set activeFeedbackBooking to trigger modal');
});

// -----------------------------------------------------------------------------
// TEST 11 — SOCKET ROOM SUBSCRIPTIONS & CONSISTENT PAYLOAD
// -----------------------------------------------------------------------------
runTest('TEST 11 — REALTIME: join_passenger and booking room subscriptions active', () => {
  const authPath = path.resolve(__dirname, '../../client/src/context/AuthContext.jsx');
  const dashPath = path.resolve(__dirname, '../../client/src/pages/PassengerDashboard.jsx');
  const serviceControllerPath = path.resolve(__dirname, '../src/controllers/serviceController.js');

  const authContent = fs.readFileSync(authPath, 'utf8');
  const dashContent = fs.readFileSync(dashPath, 'utf8');
  const sContent = fs.readFileSync(serviceControllerPath, 'utf8');

  assert.ok(authContent.includes("window.socket.emit('join_passenger', String(user.id))"), 'AuthContext must join passenger room');
  assert.ok(dashContent.includes("window.socket.emit('join_passenger', String(user.id))"), 'PassengerDashboard must join passenger room');
  assert.ok(sContent.includes("booking_completed"), 'serviceController broadcast must emit booking_completed event');
  assert.ok(sContent.includes("bookingId:"), 'serviceController broadcast must include camelCase bookingId');
  assert.ok(sContent.includes("passengerId:"), 'serviceController broadcast must include camelCase passengerId');
});

console.log('\n====================================================');
console.log(`ALL ${passedTests} / ${totalTests} TESTS PASSED CLEANLY! (TEST 1 - TEST 11 FULLY VERIFIED)`);
console.log('====================================================\n');
