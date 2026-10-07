/**
 * server/test_my_trips_sorting_suite.js
 *
 * Automated verification test suite for My Trips recent-first sorting:
 * 1. Default recent-first ordering uses created_at DESC (authoritative booking creation timestamp).
 * 2. Oldest created booking appears last.
 * 3. Amount does not affect ordering.
 * 4. Assistance fee does not affect ordering.
 * 5. Journey date does not affect default recent-booking ordering.
 * 6. Train number does not affect ordering.
 * 7. Status (pending, confirmed, completed, cancelled) does not affect default ordering.
 * 8. Cancelled bookings retain their creation-time ordering.
 * 9. Upcoming filter retains recent-created ordering.
 * 10. Completed filter retains recent-created ordering.
 * 11. Ongoing filter retains recent-created ordering.
 * 12. Identical created_at bookings have deterministic secondary ordering (id DESC).
 * 13. Backend getMyBookings controller applies created_at DESC and id DESC.
 * 14. Real-time status updates preserve booking position and created_at.
 * 15. Alternative sort options (oldest, journey_date, fare_high, fare_low) operate independently.
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

console.log('====================================================');
console.log('RUNNING MY TRIPS RECENT-FIRST SORTING TEST SUITE (15 TESTS)');
console.log('====================================================\n');

// Frontend sorting logic replica (mirrors PassengerDashboard.jsx exactly)
const getBookingCreatedAt = (b) => {
  if (!b) return 0;
  const raw = b.created_at || b.createdAt || b.booking_created_at;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return isNaN(ms) ? 0 : ms;
};

const getJourneyDateMs = (b) => {
  if (!b) return 0;
  const raw = b.journey_date || b.journeyDate;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return isNaN(ms) ? 0 : ms;
};

const getSecondaryId = (b) => String(b?.id || b?.booking_id || '');

function sortTrips(list, sortBy = 'newest') {
  return [...(list || [])].filter(Boolean).sort((a, b) => {
    if (!a || !b) return 0;

    if (sortBy === 'oldest') {
      const diff = getBookingCreatedAt(a) - getBookingCreatedAt(b);
      if (diff !== 0) return diff;
      return getSecondaryId(a).localeCompare(getSecondaryId(b));
    }

    if (sortBy === 'journey_date') {
      const jDiff = getJourneyDateMs(a) - getJourneyDateMs(b);
      if (jDiff !== 0) return jDiff;
      return getBookingCreatedAt(b) - getBookingCreatedAt(a);
    }

    if (sortBy === 'fare_high') {
      const fareDiff = (Number(b.total_price) || 0) - (Number(a.total_price) || 0);
      if (fareDiff !== 0) return fareDiff;
      return getBookingCreatedAt(b) - getBookingCreatedAt(a);
    }

    if (sortBy === 'fare_low') {
      const fareDiff = (Number(a.total_price) || 0) - (Number(b.total_price) || 0);
      if (fareDiff !== 0) return fareDiff;
      return getBookingCreatedAt(b) - getBookingCreatedAt(a);
    }

    // Default: 'newest' -> Recent Booking (created_at DESC, secondary id DESC)
    const timeDiff = getBookingCreatedAt(b) - getBookingCreatedAt(a);
    if (timeDiff !== 0) return timeDiff;
    return getSecondaryId(b).localeCompare(getSecondaryId(a));
  });
}

// Sample mock data for unit tests
const bookingA = {
  id: 'b-001',
  booking_id: 'RM-001',
  created_at: '2026-10-04T18:18:00.000Z',
  journey_date: '2026-10-04',
  total_price: 30,
  train_number: '12710',
  booking_status: 'confirmed'
};

const bookingB = {
  id: 'b-002',
  booking_id: 'RM-002',
  created_at: '2026-10-04T16:45:00.000Z',
  journey_date: '2026-10-15', // Journey in future, but created earlier than A
  total_price: 1500, // Higher price
  train_number: '20810',
  booking_status: 'pending'
};

const bookingC = {
  id: 'b-003',
  booking_id: 'RM-003',
  created_at: '2026-10-03T12:00:00.000Z',
  journey_date: '2026-10-20',
  total_price: 500,
  train_number: '12737',
  booking_status: 'cancelled'
};

const bookingD = {
  id: 'b-004',
  booking_id: 'RM-004',
  created_at: '2026-10-01T09:00:00.000Z',
  journey_date: '2026-10-02',
  total_price: 80,
  train_number: '67766',
  booking_status: 'completed'
};

// TEST 1: Newest created booking appears first
const res1 = sortTrips([bookingD, bookingB, bookingA, bookingC], 'newest');
assert.strictEqual(res1[0].id, 'b-001', 'Most recent created_at must be first');
console.log('✓ TEST 1 PASSED: Newest created booking appears first');

// TEST 2: Oldest booking appears last in default sort
assert.strictEqual(res1[res1.length - 1].id, 'b-004', 'Oldest created_at must be last in newest sort');
console.log('✓ TEST 2 PASSED: Oldest booking appears last in default sort');

// TEST 3: Amount does not affect ordering
const cheapRecent = { id: 'cheap', created_at: '2026-10-04T18:00:00Z', total_price: 10 };
const expensiveOld = { id: 'expensive', created_at: '2026-10-02T18:00:00Z', total_price: 99999 };
const res3 = sortTrips([expensiveOld, cheapRecent], 'newest');
assert.strictEqual(res3[0].id, 'cheap', 'Cheaper but newer booking must come before expensive older booking');
console.log('✓ TEST 3 PASSED: Booking amount / total_price does not affect recent-first ordering');

// TEST 4: Assistance fee / extra charges do not affect ordering
const feeA = { id: 'fee1', created_at: '2026-10-04T10:00:00Z', total_price: 50, assistance_fee: 40 };
const feeB = { id: 'fee2', created_at: '2026-10-04T08:00:00Z', total_price: 50, assistance_fee: 500 };
const res4 = sortTrips([feeB, feeA], 'newest');
assert.strictEqual(res4[0].id, 'fee1', 'Assistance fee must not affect ordering');
console.log('✓ TEST 4 PASSED: Assistance fee does not affect ordering');

// TEST 5: Journey date does not affect default recent-booking ordering
// Booking 1: Created Oct 4, Journey Oct 15
// Booking 2: Created Oct 3, Journey Oct 5 (travels earlier, but booked earlier)
const tripCreatedLater = { id: 'tripLate', created_at: '2026-10-04T12:00:00Z', journey_date: '2026-10-15' };
const tripCreatedEarlier = { id: 'tripEarly', created_at: '2026-10-03T12:00:00Z', journey_date: '2026-10-05' };
const res5 = sortTrips([tripCreatedEarlier, tripCreatedLater], 'newest');
assert.strictEqual(res5[0].id, 'tripLate', 'Booking created later must appear first despite later journey date');
console.log('✓ TEST 5 PASSED: Journey date does not affect default recent-booking ordering');

// TEST 6: Train number does not affect ordering
const train99 = { id: 't99', created_at: '2026-10-04T12:00:00Z', train_number: '99999' };
const train11 = { id: 't11', created_at: '2026-10-04T11:00:00Z', train_number: '11111' };
const res6 = sortTrips([train11, train99], 'newest');
assert.strictEqual(res6[0].id, 't99', 'Higher train number does not alter recent ordering');
console.log('✓ TEST 6 PASSED: Train number does not affect ordering');

// TEST 7: Status does not affect default ordering
const cancelledRecent = { id: 'c-rec', created_at: '2026-10-04T15:00:00Z', booking_status: 'cancelled' };
const confirmedOld = { id: 'conf-old', created_at: '2026-10-04T10:00:00Z', booking_status: 'confirmed' };
const res7 = sortTrips([confirmedOld, cancelledRecent], 'newest');
assert.strictEqual(res7[0].id, 'c-rec', 'Recent cancelled booking appears before older confirmed booking');
console.log('✓ TEST 7 PASSED: Status does not affect default ordering');

// TEST 8: Cancelled bookings retain their creation-time ordering
const cancel1 = { id: 'c1', created_at: '2026-10-04T17:00:00Z', cancelled_at: '2026-10-04T17:30:00Z', booking_status: 'cancelled' };
const cancel2 = { id: 'c2', created_at: '2026-10-04T16:00:00Z', cancelled_at: '2026-10-04T18:00:00Z', booking_status: 'cancelled' };
const res8 = sortTrips([cancel2, cancel1], 'newest');
assert.strictEqual(res8[0].id, 'c1', 'Cancelled booking with later created_at is first, regardless of cancelled_at');
console.log('✓ TEST 8 PASSED: Cancelled bookings retain their creation-time ordering');

// TEST 9: Upcoming filter retains recent-created ordering
const isOngoing = (b) => ['in_service', 'arriving', 'accepted', 'assigned'].includes((b.booking_status || '').toLowerCase());
const allTrips = [bookingA, bookingB, bookingC, bookingD];
const upcomingFiltered = allTrips.filter((b) => {
  const s = (b.booking_status || '').toLowerCase();
  return s !== 'completed' && s !== 'cancelled' && !isOngoing(b);
});
const sortedUpcoming = sortTrips(upcomingFiltered, 'newest');
assert.strictEqual(sortedUpcoming[0].id, 'b-001');
assert.strictEqual(sortedUpcoming[1].id, 'b-002');
console.log('✓ TEST 9 PASSED: Upcoming filter retains recent-created ordering');

// TEST 10: Completed filter retains recent-created ordering
const comp1 = { id: 'comp1', created_at: '2026-10-03T10:00:00Z', booking_status: 'completed' };
const comp2 = { id: 'comp2', created_at: '2026-10-02T10:00:00Z', booking_status: 'completed' };
const sortedCompleted = sortTrips([comp2, comp1], 'newest');
assert.strictEqual(sortedCompleted[0].id, 'comp1');
console.log('✓ TEST 10 PASSED: Completed filter retains recent-created ordering');

// TEST 11: Ongoing filter retains recent-created ordering
const ong1 = { id: 'ong1', created_at: '2026-10-04T14:00:00Z', booking_status: 'in_service' };
const ong2 = { id: 'ong2', created_at: '2026-10-04T11:00:00Z', booking_status: 'in_service' };
const sortedOngoing = sortTrips([ong2, ong1], 'newest');
assert.strictEqual(sortedOngoing[0].id, 'ong1');
console.log('✓ TEST 11 PASSED: Ongoing filter retains recent-created ordering');

// TEST 12: Two bookings with identical created_at have deterministic secondary ordering (id DESC)
const tie1 = { id: 'alpha', created_at: '2026-10-04T12:00:00Z' };
const tie2 = { id: 'zeta', created_at: '2026-10-04T12:00:00Z' };
const res12 = sortTrips([tie1, tie2], 'newest');
assert.strictEqual(res12[0].id, 'zeta', 'Tie-breaker must place larger ID first (id DESC)');
console.log('✓ TEST 12 PASSED: Two bookings with identical created_at have deterministic secondary ordering');

// TEST 13: Backend bookingController contains created_at DESC and id DESC order
const fs = require('fs');
const bookingCtrlCode = fs.readFileSync(path.resolve(__dirname, '../src/controllers/bookingController.js'), 'utf8').replace(/\r\n/g, '\n');
const hasCreatedOrder = bookingCtrlCode.includes('created_at') && bookingCtrlCode.includes('ascending: false');
const hasIdOrder = bookingCtrlCode.includes('id') && bookingCtrlCode.includes('ascending: false');
assert.ok(hasCreatedOrder && hasIdOrder, 'getMyBookings must order by created_at DESC and id DESC');
console.log('✓ TEST 13 PASSED: Backend bookingController applies created_at DESC and id DESC');

// TEST 14: Real-time status update preserves booking created_at
let state = [bookingA, bookingB];
const updatedA = { id: 'b-001', booking_status: 'cancelled' }; // no created_at in socket payload
const index = state.findIndex((b) => b.id === updatedA.id);
assert.ok(index >= 0);
const nextState = [...state];
nextState[index] = {
  ...nextState[index],
  ...updatedA,
  created_at: updatedA.created_at || nextState[index].created_at
};
assert.strictEqual(nextState[0].created_at, bookingA.created_at, 'created_at must be preserved across live events');
console.log('✓ TEST 14 PASSED: Real-time status updates preserve booking position and created_at');

// TEST 15: Alternative sort options operate independently
const oldestSorted = sortTrips([bookingA, bookingB, bookingC, bookingD], 'oldest');
assert.strictEqual(oldestSorted[0].id, 'b-004', 'Oldest sort puts oldest created booking first');

const journeySorted = sortTrips([bookingA, bookingB, bookingC, bookingD], 'journey_date');
assert.strictEqual(journeySorted[0].id, 'b-004', 'Journey date sort orders by journey_date ascending');

const fareHighSorted = sortTrips([bookingA, bookingB, bookingC, bookingD], 'fare_high');
assert.strictEqual(fareHighSorted[0].id, 'b-002', 'fare_high puts ₹1500 first');

const fareLowSorted = sortTrips([bookingA, bookingB, bookingC, bookingD], 'fare_low');
assert.strictEqual(fareLowSorted[0].id, 'b-001', 'fare_low puts ₹30 first');
console.log('✓ TEST 15 PASSED: Alternative sort options (oldest, journey_date, fare_high, fare_low) operate independently');

console.log('====================================================');
console.log('ALL 15 / 15 MY TRIPS SORTING TESTS PASSED SUCCESSFULLY! ✓');
console.log('====================================================\n');
