/**
 * Automated Test Suite: ONECOOLIE Support Navigation & My Trips Badge Audit
 * 
 * Verifies:
 * 1. HelpCenter.jsx does NOT contain any hardcoded "3" badge for My Trips.
 * 2. HelpCenter.jsx dynamically renders activeTripsCount from user bookings only when > 0.
 * 3. HelpCenter.jsx queries /bookings/my-bookings for standalone navigation.
 * 4. HelpCenter.jsx passes actual bookings and activeBookings to PassengerNotifications.
 * 5. supportService.js preserves booking and bookingId in navigation state without touching badge counters.
 * 6. BookingLive.jsx uses handleContactSupport to preserve trip context.
 * 7. ActiveBooking.jsx uses handleContactSupport with booking context.
 * 8. HelpSupportPage.jsx reads booking from location.state or searchParams and provides natural return navigation.
 * 9. RaiseTicketView.jsx pre-populates trip dropdown from activeTrip without crashing or displaying undefined.
 * 10. SupportAssistantChat.jsx handles activeTrip gracefully in greeting.
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
console.log('   ONECOOLIE SUPPORT NAVIGATION & MY TRIPS BADGE AUDIT');
console.log('================================================================\n');

const helpCenterPath = path.resolve(__dirname, '../../client/src/components/support/HelpCenter.jsx');
const supportServicePath = path.resolve(__dirname, '../../client/src/services/supportService.js');
const bookingLivePath = path.resolve(__dirname, '../../client/src/pages/BookingLive.jsx');
const activeBookingPath = path.resolve(__dirname, '../../client/src/components/ActiveBooking.jsx');
const helpSupportPagePath = path.resolve(__dirname, '../../client/src/pages/HelpSupportPage.jsx');
const raiseTicketPath = path.resolve(__dirname, '../../client/src/components/support/RaiseTicketView.jsx');
const chatPath = path.resolve(__dirname, '../../client/src/components/support/SupportAssistantChat.jsx');

const helpCenterCode = fs.readFileSync(helpCenterPath, 'utf8');
const supportServiceCode = fs.readFileSync(supportServicePath, 'utf8');
const bookingLiveCode = fs.readFileSync(bookingLivePath, 'utf8');
const activeBookingCode = fs.readFileSync(activeBookingPath, 'utf8');
const helpSupportPageCode = fs.readFileSync(helpSupportPagePath, 'utf8');
const raiseTicketCode = fs.readFileSync(raiseTicketPath, 'utf8');
const chatCode = fs.readFileSync(chatPath, 'utf8');

// 1. Static Audit: Zero hardcoded "3" in HelpCenter navbar
runTest('1. HelpCenter.jsx contains ZERO hardcoded "3" badge for My Trips', () => {
  // Check that no span with literal 3 exists for My Trips badge
  assert(!helpCenterCode.includes('>3<') && !helpCenterCode.includes('>\n                  3\n'), 
    'HelpCenter must NOT have hardcoded 3 badge on My Trips button');
});

// 2. HelpCenter dynamic badge rendering
runTest('2. HelpCenter.jsx renders activeTripsCount dynamically only when > 0', () => {
  assert(helpCenterCode.includes('{activeTripsCount > 0 && ('), 'Must conditionally render activeTripsCount badge');
  assert(helpCenterCode.includes('{activeTripsCount}'), 'Must display activeTripsCount variable');
});

// 3. HelpCenter queries /bookings/my-bookings
runTest('3. HelpCenter.jsx queries /bookings/my-bookings when standalone', () => {
  assert(helpCenterCode.includes("axios.get('/bookings/my-bookings')"), 'Must fetch bookings for passenger');
  assert(helpCenterCode.includes("['pending', 'accepted', 'arrived', 'arriving', 'reached', 'in_progress', 'in_service', 'allocated', 'assigned']"), 
    'Must filter active trip statuses');
});

// 4. PassengerNotifications passed bookings
runTest('4. HelpCenter.jsx supplies bookings and activeBookings to PassengerNotifications', () => {
  assert(helpCenterCode.includes('bookings={allBookings}'), 'Must pass allBookings');
  assert(helpCenterCode.includes('activeBookings={activeBookings}'), 'Must pass activeBookings');
});

// 5. supportService passes booking context cleanly
runTest('5. supportService.js preserves booking context in state and query param', () => {
  assert(supportServiceCode.includes('navState.booking = options.booking'), 'Must store booking in navState');
  assert(supportServiceCode.includes('navState.bookingId = options.bookingId'), 'Must store bookingId in navState');
  assert(supportServiceCode.includes('?bookingId='), 'Must allow search param query for bookingId');
  assert(!supportServiceCode.includes('tripCount') && !supportServiceCode.includes('badge:'), 
    'supportService must NEVER manipulate trip badges');
});

// 6. BookingLive passes booking context
runTest('6. BookingLive.jsx Support button passes booking context', () => {
  assert(bookingLiveCode.includes("handleContactSupport(navigate"), 'Must call handleContactSupport');
  assert(bookingLiveCode.includes("bookingId: booking?.booking_id || booking?.id || id"), 'Must pass bookingId');
});

// 7. ActiveBooking passes booking context
runTest('7. ActiveBooking.jsx Need Help card passes booking context', () => {
  assert(activeBookingCode.includes("handleContactSupport(navigate, {"), 'Must call handleContactSupport with options');
  assert(activeBookingCode.includes("bookingId: booking?.booking_id || booking?.id"), 'Must pass bookingId');
});

// 8. HelpSupportPage resolves activeTrip and handles back navigation
runTest('8. HelpSupportPage.jsx restores activeTrip and returns to trip on back', () => {
  assert(helpSupportPageCode.includes('location.state?.booking'), 'Must read booking from location.state');
  assert(helpSupportPageCode.includes('searchParams.get(\'bookingId\')'), 'Must read bookingId from searchParams');
  assert(helpSupportPageCode.includes('navigate(`/booking/${originBookingId}`)'), 'Must return to booking on back when available');
});

// 9. RaiseTicketView handles activeTrip safely
runTest('9. RaiseTicketView.jsx formats activeTrip options without undefined tokens', () => {
  assert(raiseTicketCode.includes('activeTrip.train_no || activeTrip.train_number || activeTrip.trainNo'), 
    'Must support snake_case and camelCase train number');
  assert(raiseTicketCode.includes('activeTrip.station_code || activeTrip.source'), 
    'Must support snake_case station code');
});

// 10. SupportAssistantChat handles activeTrip safely
runTest('10. SupportAssistantChat.jsx formats activeTrip train details gracefully', () => {
  assert(chatCode.includes('activeTrip?.train_no || activeTrip?.train_number || activeTrip?.trainNo'), 
    'Must support snake_case and camelCase in chat welcome');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
