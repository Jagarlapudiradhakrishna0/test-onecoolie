/**
 * Automated Test Suite: ONECOOLIE Change Booking Navigation Loop & Modification Audit
 * 
 * Tests:
 * 1. RebookingModal.jsx has lifecycle guards (prevIsOpenRef, prevBookingIdRef) preventing background polling reset loop
 * 2. RebookingModal.jsx single callback dispatch prevents duplicate handler execution
 * 3. RebookingModal.jsx route fetching is guarded with prevFetchedTrainRef
 * 4. ActiveBooking.jsx cleanly mounts RebookingModal without automatic reopening
 * 5. ActiveBooking.jsx bridges CancellationModal to RebookingModal via onRequestRebook
 * 6. BookingLive.jsx updates sessionStorage cache on onUpdate to prevent stale state on reload
 * 7. Server rebook route (/api/bookings/:id/rebook) updates existing record (no POST /bookings creation)
 * 8. Server enforces assistant-accepted lock on stations & train details
 * 9. Server emits socket updates to booking, passenger, assistant, and admin rooms
 * 10. PassengerDashboard.jsx has clean callbacks without duplicate onRebooked invocation
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failedTests++;
  }
}

console.log('================================================================');
console.log('   ONECOOLIE CHANGE BOOKING NAVIGATION & LIFECYCLE AUDIT');
console.log('================================================================\n');

const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/RebookingModal.jsx');
const activeBookingPath = path.resolve(__dirname, '../../client/src/components/ActiveBooking.jsx');
const bookingLivePath = path.resolve(__dirname, '../../client/src/pages/BookingLive.jsx');
const dashboardPath = path.resolve(__dirname, '../../client/src/pages/PassengerDashboard.jsx');
const controllerPath = path.resolve(__dirname, '../src/controllers/bookingController.js');
const routesPath = path.resolve(__dirname, '../src/routes/bookingRoutes.js');

const modalCode = fs.readFileSync(modalPath, 'utf8');
const activeBookingCode = fs.readFileSync(activeBookingPath, 'utf8');
const bookingLiveCode = fs.readFileSync(bookingLivePath, 'utf8');
const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');
const routesCode = fs.readFileSync(routesPath, 'utf8');

// 1. RebookingModal lifecycle guard
runTest('1. RebookingModal has prevIsOpenRef and prevBookingIdRef to prevent background polling wipe', () => {
  assert(modalCode.includes('prevBookingIdRef = useRef'), 'Must define prevBookingIdRef');
  assert(modalCode.includes('prevIsOpenRef = useRef'), 'Must define prevIsOpenRef');
  assert(
    modalCode.includes('!prevIsOpenRef.current || prevBookingIdRef.current !== targetBookingId'),
    'Must check prevIsOpenRef or targetBookingId change before initializing state'
  );
});

// 2. RebookingModal single callback dispatch
runTest('2. RebookingModal uses clean single callback dispatch on submit success', () => {
  assert(modalCode.includes('if (onSuccess) {'), 'Must check onSuccess');
  assert(modalCode.includes('} else if (onRebooked) {'), 'Must check onRebooked as fallback');
  assert(modalCode.includes('} else if (onClose) {'), 'Must check onClose as fallback');
  assert(!modalCode.includes('if (onRebooked) onRebooked(updated);\n      if (onSuccess) onSuccess(updated);\n      onClose();'),
    'Must not call onRebooked, onSuccess, and onClose sequentially in same tick');
});

// 3. RebookingModal route fetching guard
runTest('3. RebookingModal route fetching is guarded with prevFetchedTrainRef', () => {
  assert(modalCode.includes('prevFetchedTrainRef = useRef'), 'Must define prevFetchedTrainRef');
  assert(
    modalCode.includes('prevFetchedTrainRef.current === cleanTrainNo && trainStops.length > 0'),
    'Must skip route re-fetch if already loaded for the current train'
  );
});

// 4. ActiveBooking.jsx cleanly mounts RebookingModal without automatic reopening
runTest('4. ActiveBooking cleanly mounts RebookingModal and closes on success', () => {
  assert(activeBookingCode.includes('<RebookingModal'), 'ActiveBooking must mount RebookingModal');
  assert(activeBookingCode.includes('onClose={() => setShowRebookingModal(false)}'), 'onClose must set showRebookingModal to false');
  assert(activeBookingCode.includes('onSuccess={(newBooking) => {'), 'onSuccess handler must be provided');
  assert(activeBookingCode.includes('setShowRebookingModal(false);'), 'onSuccess must set showRebookingModal to false');
  assert(activeBookingCode.includes('if (onUpdate) onUpdate(newBooking);'), 'onSuccess must update parent trip');
});

// 5. ActiveBooking bridges CancellationModal to RebookingModal
runTest('5. ActiveBooking bridges CancellationModal to RebookingModal via onRequestRebook', () => {
  assert(
    activeBookingCode.includes('onRequestRebook={() => {'),
    'CancellationModal in ActiveBooking must have onRequestRebook prop'
  );
  assert(
    activeBookingCode.includes('setShowCancellationModal(false);\n            setShowRebookingModal(true);'),
    'onRequestRebook must switch from cancellation to rebooking modal cleanly'
  );
});

// 6. BookingLive.jsx updates sessionStorage cache on onUpdate
runTest('6. BookingLive updates sessionStorage cache on onUpdate to prevent stale reloads', () => {
  assert(bookingLiveCode.includes('onUpdate={(b) => {'), 'BookingLive onUpdate must handle block');
  assert(bookingLiveCode.includes('sessionStorage.setItem(`booking_${id}`'), 'Must update sessionStorage on booking update');
});

// 7. Server rebook endpoint updates existing booking without creating new booking
runTest('7. Server rebook endpoint performs UPDATE on bookings table', () => {
  assert(routesCode.includes("router.post('/:id/rebook', protect, rebookBooking);"), 'Rebook endpoint must be POST /:id/rebook');
  assert(controllerCode.includes("exports.rebookBooking = async (req, res) => {"), 'rebookBooking controller must exist');
  assert(controllerCode.includes(".from('bookings')") && controllerCode.includes(".update(updatePayload)"), 'Must execute UPDATE on bookings table, never INSERT');
});

// 8. Server enforces assistant-accepted lock
runTest('8. Server enforces assistant-accepted lock on stations & train', () => {
  assert(controllerCode.includes('isAssistantAcceptedBooking(booking)'), 'Must check assistant acceptance');
  assert(
    controllerCode.includes('Station and train details cannot be changed after an assistant has accepted this booking.'),
    'Must reject station/train changes after assistant has accepted'
  );
});

// 9. Server emits real-time updates across portals
runTest('9. Server emits real-time updates to booking, passenger, assistant, and admin rooms', () => {
  assert(controllerCode.includes("io.to(`booking_${booking.id}`).emit('booking_updated', formatted);"), 'Must emit to booking room');
  assert(controllerCode.includes("io.to(`passenger_${booking.passenger_id}`).emit('booking_updated', formatted);"), 'Must emit to passenger room');
  assert(controllerCode.includes("io.to('admin_room').emit('booking_updated',"), 'Must emit to admin room');
  assert(controllerCode.includes("io.to(`user_${updated.assistant_id}`).emit('booking_updated',"), 'Must emit to assistant room');
});

// 10. PassengerDashboard.jsx clean callbacks
runTest('10. PassengerDashboard RebookingModal uses clean single onSuccess callback', () => {
  assert(dashboardCode.includes('<RebookingModal'), 'Dashboard mounts RebookingModal');
  assert(!dashboardCode.includes('onRebooked={() => {'), 'Dashboard should not have duplicate onRebooked prop');
  assert(dashboardCode.includes('onSuccess={() => {'), 'Dashboard should use onSuccess prop');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
